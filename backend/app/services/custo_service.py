"""
Servico de logica de negocio central para gestao de custos de colaboradores.

Responsabilidades:
- Calcular o custo total de um conjunto de componentes
- Criar ou atualizar (upsert) registros de custo por (colaborador_id, mes, ano)
- Agregar custos por colaborador e por departamento para um periodo
"""

from decimal import Decimal
from typing import Dict, List

from sqlalchemy.orm import Session

from app import models, schemas


def calcular_total(componentes: List[schemas.ComponenteCustoSchema]) -> Decimal:
    """Calcula o custo total como soma exata dos componentes.

    A soma e feita com aritmetica Decimal para evitar erros de ponto flutuante.
    Retorna Decimal("0") para lista vazia.
    """
    return sum((c.valor for c in componentes), Decimal("0"))


def upsert_registro_custo(
    db: Session,
    dados: schemas.RegistroCustoCreate,
) -> models.RegistroCusto:
    """Cria ou atualiza registro de custo por (colaborador_id, mes, ano).

    - Se ja existe um registro para a combinacao (colaborador_id, mes, ano),
      remove os componentes antigos e insere os novos.
    - Caso contrario, cria um novo RegistroCusto e insere os componentes.

    Faz commit e refresh antes de retornar o objeto atualizado.
    """
    # Busca registro existente
    registro = (
        db.query(models.RegistroCusto)
        .filter(
            models.RegistroCusto.colaborador_id == dados.colaborador_id,
            models.RegistroCusto.mes == dados.mes,
            models.RegistroCusto.ano == dados.ano,
        )
        .first()
    )

    if registro:
        # Atualiza: remove componentes antigos e insere novos
        db.query(models.ComponenteCusto).filter(
            models.ComponenteCusto.registro_custo_id == registro.id
        ).delete()
    else:
        # Cria novo registro
        registro = models.RegistroCusto(
            colaborador_id=dados.colaborador_id,
            mes=dados.mes,
            ano=dados.ano,
        )
        db.add(registro)
        db.flush()  # para obter o ID gerado pelo banco

    # Insere componentes
    for comp in dados.componentes:
        componente = models.ComponenteCusto(
            registro_custo_id=registro.id,
            tipo=comp.tipo,
            valor=comp.valor,
        )
        db.add(componente)

    db.commit()
    db.refresh(registro)
    return registro


def agregar_por_colaborador(
    db: Session,
    mes: int,
    ano: int,
) -> List[Dict]:
    """Agrega custos por colaborador para o periodo (mes, ano).

    Retorna apenas colaboradores ativos que possuem registro de custo no periodo.
    Cada item do resultado contem: id, nome, departamento, cargo, nivel,
    tipo_contrato, total e componentes (dict tipo -> valor).
    """
    registros = (
        db.query(models.RegistroCusto)
        .join(models.Colaborador)
        .join(models.Departamento)
        .filter(
            models.RegistroCusto.mes == mes,
            models.RegistroCusto.ano == ano,

        )
        .all()
    )

    resultado = []
    for reg in registros:
        componentes_dict = {c.tipo: c.valor for c in reg.componentes}
        total = sum(componentes_dict.values(), Decimal("0"))
        resultado.append(
            {
                "id": reg.colaborador.id,
                "nome": reg.colaborador.nome,
                "departamento": reg.colaborador.departamento.nome,
                "cargo": reg.colaborador.cargo,
                "nivel": reg.colaborador.nivel,
                "tipo_contrato": reg.colaborador.tipo_contrato,
                "total": total,
                "componentes": componentes_dict,
            }
        )

    return resultado


def agregar_por_departamento(
    db: Session,
    mes: int,
    ano: int,
) -> List[Dict]:
    """Agrega custos por departamento para o periodo (mes, ano).

    Reutiliza agregar_por_colaborador e agrupa os resultados por departamento.
    Cada item do resultado contem: id, nome, total, num_colaboradores e colaboradores.
    """
    colaboradores_data = agregar_por_colaborador(db, mes, ano)

    departamentos = {}
    for colab in colaboradores_data:
        dept_nome = colab["departamento"]
        if dept_nome not in departamentos:
            # Busca o ID do departamento pelo nome
            dept = (
                db.query(models.Departamento)
                .filter(models.Departamento.nome == dept_nome)
                .first()
            )
            departamentos[dept_nome] = {
                "id": dept.id if dept else 0,
                "nome": dept_nome,
                "total": Decimal("0"),
                "num_colaboradores": 0,
                "colaboradores": [],
            }
        departamentos[dept_nome]["total"] += colab["total"]
        departamentos[dept_nome]["num_colaboradores"] += 1
        departamentos[dept_nome]["colaboradores"].append(colab)

    return list(departamentos.values())
