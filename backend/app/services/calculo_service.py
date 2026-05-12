"""
Servico de calculo automatico de custos.

Dado um colaborador + variaveis mensais, calcula todos os encargos
usando os ParametrosCalculo cadastrados no banco.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict
from sqlalchemy.orm import Session
from app import models


def _get_parametros(db: Session) -> Dict[str, Decimal]:
    params = db.query(models.ParametroCalculo).all()
    return {p.chave: p.valor for p in params}


def calcular_custo_mensal(
    db: Session,
    colaborador: models.Colaborador,
    # Variaveis mensais (podem sobrescrever o cadastro)
    salario_base_override: Decimal = None,
    bonus_aws_override: Decimal = None,
    bonus_prd: Decimal = Decimal("0"),
    comissoes: Decimal = Decimal("0"),
    hora_extra: Decimal = Decimal("0"),
) -> Dict[str, Decimal]:
    """
    Calcula todos os componentes de custo de um colaborador para um mes.

    Valores do CADASTRO (fixos, usados se nao houver override):
      salario_base, bonus_aws, refeicao, transporte, seguro_saude, seguro_vida

    Valores VARIAVEIS por mes (informados no lancamento):
      bonus_prd, comissoes, hora_extra
      salario_base_override (se houve reajuste neste mes)
      bonus_aws_override (se houve mudanca neste mes)

    Valores CALCULADOS automaticamente pelos parametros:
      fgts, gps, ferias, decimo_terceiro, fgts_rescisao, equipamentos, escritorio
    """
    p = _get_parametros(db)

    FGTS_RATE       = p.get("FGTS",               Decimal("0.08"))
    GPS_RATE        = p.get("GPS",                 Decimal("0.278"))
    MULTA_FGTS_RATE = p.get("MULTA_FGTS",          Decimal("0.032"))
    EQUIP_MENSAL    = p.get("EQUIPAMENTOS_MENSAL",  Decimal("343.27"))
    ESCRIT_MENSAL   = p.get("ESCRITORIO_MENSAL",    Decimal("1762.59"))

    def r(v: Decimal) -> Decimal:
        return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def d(v) -> Decimal:
        return Decimal(str(v)) if v is not None else Decimal("0")

    # Usa override se informado, senao usa o do cadastro
    salario   = d(salario_base_override or colaborador.salario_base or 0)
    bonus_aws = d(bonus_aws_override if bonus_aws_override is not None else colaborador.bonus_aws or 0)
    refeicao  = d(colaborador.refeicao or 0)
    transporte = d(colaborador.transporte or 0)
    seg_saude  = d(colaborador.seguro_saude or 0)
    seg_vida   = d(colaborador.seguro_vida or 0)

    remuneracao = salario + bonus_aws + d(bonus_prd) + d(comissoes) + d(hora_extra)

    componentes: Dict[str, Decimal] = {}

    # Remuneracao total
    componentes["remuneracao"] = r(remuneracao)

    # Beneficios do cadastro
    if refeicao  > 0: componentes["refeicao"]    = r(refeicao)
    if transporte > 0: componentes["transporte"]  = r(transporte)
    if seg_saude  > 0: componentes["seguro_saude"] = r(seg_saude)
    if seg_vida   > 0: componentes["seguro_vida"]  = r(seg_vida)

    # Encargos calculados (apenas CLT)
    if colaborador.tipo_contrato == "CLT":
        componentes["fgts"]              = r(remuneracao * FGTS_RATE)
        componentes["gps"]               = r(remuneracao * GPS_RATE)
        componentes["ferias"]            = r(remuneracao / 12)
        componentes["decimo_terceiro"]   = r(remuneracao / 12)
        componentes["fgts_rescisao"]     = r(remuneracao * MULTA_FGTS_RATE)

    # Custos fixos rateados (todos)
    componentes["equipamentos"] = r(EQUIP_MENSAL)
    componentes["escritorio"]   = r(ESCRIT_MENSAL)

    return componentes
