"""
Servico de logica de negocio central para gestao de custos de colaboradores.
"""

from decimal import Decimal
from typing import Dict, List

from sqlalchemy.orm import Session

from app import models, schemas


def calcular_total(componentes: List[schemas.ComponenteCustoSchema]) -> Decimal:
    return sum((c.valor for c in componentes), Decimal("0"))


def upsert_registro_custo(
    db: Session,
    dados: schemas.RegistroCustoCreate,
) -> models.RegistroCusto:
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
        db.query(models.ComponenteCusto).filter(
            models.ComponenteCusto.registro_custo_id == registro.id
        ).delete()
    else:
        registro = models.RegistroCusto(
            colaborador_id=dados.colaborador_id,
            mes=dados.mes,
            ano=dados.ano,
        )
        db.add(registro)
        db.flush()

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

    Retorna TODOS os colaboradores que possuem registro de custo no periodo,
    independente do status ativo/inativo atual.
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
    """Agrega custos por departamento para o periodo (mes, ano)."""
    colaboradores_data = agregar_por_colaborador(db, mes, ano)

    departamentos = {}
    for colab in colaboradores_data:
        dept_nome = colab["departamento"]
        if dept_nome not in departamentos:
            dept = (
                db.query(models.Departamento)
                .filter(models.Departamento.nome == dept_nome)
                .first()
            )
            # Busca budget mensal da nova tabela
            budget = None
            if dept:
                budget_reg = (
                    db.query(models.BudgetDepartamento)
                    .filter(
                        models.BudgetDepartamento.departamento_id == dept.id,
                        models.BudgetDepartamento.mes == mes,
                        models.BudgetDepartamento.ano == ano,
                    )
                    .first()
                )
                budget = float(budget_reg.valor) if budget_reg else None

            departamentos[dept_nome] = {
                "id": dept.id if dept else 0,
                "nome": dept_nome,
                "total": Decimal("0"),
                "num_colaboradores": 0,
                "colaboradores": [],
                "budget_mensal": budget,
            }
        departamentos[dept_nome]["total"] += colab["total"]
        departamentos[dept_nome]["num_colaboradores"] += 1
        departamentos[dept_nome]["colaboradores"].append(colab)

    return list(departamentos.values())
