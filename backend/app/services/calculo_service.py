"""
Servico de calculo automatico de custos.
Dado um colaborador + variaveis mensais, calcula todos os encargos
usando os ParametrosCalculo cadastrados no banco.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict

from sqlalchemy.orm import Session
from app import models


def _get_parametros(db: Session):
    return db.query(models.ParametroCalculo).all()


def calcular_custo_mensal(
    db: Session,
    colaborador: models.Colaborador,
    salario_base_override: Decimal = None,
    bonus_aws_override: Decimal = None,
    bonus_prd: Decimal = Decimal("0"),
    comissoes: Decimal = Decimal("0"),
    hora_extra: Decimal = Decimal("0"),
) -> Dict[str, Decimal]:
    """
    Calcula todos os componentes de custo de um colaborador para um mes.
    Aplica dinamicamente todos os parametros cadastrados.
    """
    parametros = _get_parametros(db)

    def r(v: Decimal) -> Decimal:
        return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    def d(v) -> Decimal:
        return Decimal(str(v)) if v is not None else Decimal("0")

    # Usa override se informado, senao usa o do cadastro
    salario    = d(salario_base_override or colaborador.salario_base or 0)
    bonus_aws  = d(bonus_aws_override if bonus_aws_override is not None else colaborador.bonus_aws or 0)
    refeicao   = d(colaborador.refeicao or 0)
    transporte = d(colaborador.transporte or 0)
    seg_saude  = d(colaborador.seguro_saude or 0)
    seg_vida   = d(colaborador.seguro_vida or 0)

    remuneracao = salario + bonus_aws + d(bonus_prd) + d(comissoes) + d(hora_extra)

    componentes: Dict[str, Decimal] = {}

    # Remuneracao total
    componentes["remuneracao"] = r(remuneracao)

    # Beneficios do cadastro
    if refeicao   > 0: componentes["refeicao"]     = r(refeicao)
    if transporte > 0: componentes["transporte"]   = r(transporte)
    if seg_saude  > 0: componentes["seguro_saude"] = r(seg_saude)
    if seg_vida   > 0: componentes["seguro_vida"]  = r(seg_vida)

    # Ferias e 13o (sempre CLT)
    if colaborador.tipo_contrato == "CLT":
        componentes["ferias"]          = r(remuneracao / 12)
        componentes["decimo_terceiro"] = r(remuneracao / 12)

    # Aplica parametros dinamicamente
    tipo_contrato = colaborador.tipo_contrato  # CLT ou PJ
    for p in parametros:
        # Verifica se aplica a este tipo de contrato
        if p.aplica_a != "todos" and p.aplica_a != tipo_contrato:
            continue

        chave = p.chave.lower()
        valor = Decimal(str(p.valor))

        if p.tipo_valor == "percentual":
            componentes[chave] = r(remuneracao * valor)
        elif p.tipo_valor == "fixo":
            componentes[chave] = r(valor)
        # tipo 'numerico' nao e aplicado automaticamente (referencia apenas)

    return componentes
