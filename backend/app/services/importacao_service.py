from decimal import Decimal, InvalidOperation
from typing import Any
from datetime import date
import re
from sqlalchemy.orm import Session
from app import models, schemas
from app.utils.excel_parser import ler_planilha
from app.services.custo_service import upsert_registro_custo

TIPOS_COMPONENTE = [
    "salario", "bonus_aws", "bonus_prd", "comissoes", "hora_extra",
    "refeicao", "transporte", "seguro_saude", "seguro_vida",
    "fgts", "gps", "equipamentos", "escritorio", "ferias",
    "decimo_terceiro", "fgts_2", "gps_2", "multa_fgts",
]


def _parse_valor(v: Any) -> Decimal:
    if v is None or v == "" or v == "-":
        return Decimal("0")
    try:
        s = str(v).replace("R$", "").replace(" ", "").replace(",", ".")
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return Decimal("0")


def _parse_data(v: Any):
    if v is None:
        return None, None
    if hasattr(v, "month"):
        return v.month, v.year
    s = str(v).strip()
    m = re.match(r"^(\d{1,2})/(\d{4})$", s)
    if m:
        return int(m.group(1)), int(m.group(2))
    return None, None


def importar_planilha(db: Session, arquivo_bytes: bytes) -> schemas.ResultadoImportacao:
    resultado = schemas.ResultadoImportacao()
    dados = ler_planilha(arquivo_bytes)

    if not dados["valido"]:
        resultado.erros.extend(dados["erros_criticos"])
        return resultado

    for i, reg in enumerate(dados["registros"], start=1):
        try:
            nome = str(reg.get("nome", "")).strip()
            departamento_nome = str(reg.get("departamento", "")).strip()
            cargo = str(reg.get("cargo", "")).strip()

            if not nome or not departamento_nome or not cargo:
                resultado.erros.append(f"Linha {i}: nome, departamento ou cargo ausente.")
                continue

            mes, ano = _parse_data(reg.get("data"))
            if not mes or not ano:
                resultado.erros.append(f"Linha {i} ({nome}): data invalida.")
                continue

            dept = db.query(models.Departamento).filter(models.Departamento.nome == departamento_nome).first()
            if not dept:
                dept = models.Departamento(nome=departamento_nome)
                db.add(dept)
                db.flush()

            fgts_val = _parse_valor(reg.get("fgts"))
            gps_val = _parse_valor(reg.get("gps"))
            tipo_contrato = "PJ" if (fgts_val == 0 and gps_val == 0) else "CLT"

            colaborador = db.query(models.Colaborador).filter(models.Colaborador.nome == nome).first()

            if colaborador:
                colaborador.departamento_id = dept.id
                colaborador.cargo = cargo
                colaborador.tipo_contrato = tipo_contrato
                db.flush()
                resultado.colaboradores_atualizados += 1
            else:
                matricula = nome.upper().replace(" ", "_")[:50]
                if db.query(models.Colaborador).filter(models.Colaborador.matricula == matricula).first():
                    matricula = f"{matricula}_{mes}{ano}"
                colaborador = models.Colaborador(
                    nome=nome, matricula=matricula, departamento_id=dept.id,
                    cargo=cargo, tipo_contrato=tipo_contrato,
                    data_admissao=date(ano, mes, 1), ativo=True,
                )
                db.add(colaborador)
                db.flush()
                resultado.colaboradores_criados += 1

            componentes = []
            for tipo in TIPOS_COMPONENTE:
                valor = _parse_valor(reg.get(tipo))
                if valor > 0:
                    componentes.append(schemas.ComponenteCustoSchema(tipo=tipo, valor=valor))

            if not componentes:
                continue

            existente = db.query(models.RegistroCusto).filter(
                models.RegistroCusto.colaborador_id == colaborador.id,
                models.RegistroCusto.mes == mes,
                models.RegistroCusto.ano == ano,
            ).first()

            dados_custo = schemas.RegistroCustoCreate(
                colaborador_id=colaborador.id, mes=mes, ano=ano, componentes=componentes,
            )
            upsert_registro_custo(db, dados_custo)

            if existente:
                resultado.registros_custo_atualizados += 1
            else:
                resultado.registros_custo_criados += 1

        except Exception as e:
            resultado.erros.append(f"Linha {i}: erro inesperado - {str(e)}")
            db.rollback()

    return resultado
