"""
Testes de propriedade para a funcao calcular_total do custo_service.

**Validates: Requirements 2.4**

Propriedade 4: Corretude do Calculo de Custo Total
Para qualquer lista de componentes de custo com valores nao-negativos,
o custo total calculado pelo sistema deve ser exatamente igual a soma
aritmetica de todos os valores dos componentes. Nenhum componente pode
ser omitido ou duplicado no calculo.

**Validates: Requirements 2.3**

Propriedade 5: Rejeicao de Valores Negativos
Para qualquer valor monetario negativo, o sistema deve rejeitar a criacao
de um ComponenteCustoSchema, levantando um ValidationError do Pydantic.
"""

from decimal import Decimal

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from pydantic import ValidationError

from app.schemas import ComponenteCustoSchema
from app.services.custo_service import calcular_total


def make_componentes(valores: list) -> list:
    """Converte uma lista de Decimals em ComponenteCustoSchema."""
    return [
        ComponenteCustoSchema(tipo="salario", valor=v)
        for v in valores
    ]


# ---------------------------------------------------------------------------
# Propriedade 4: Corretude do Calculo de Custo Total
# Valida: Requisitos 2.4
# ---------------------------------------------------------------------------

@given(
    st.lists(
        st.decimals(min_value=0, max_value=100000, places=2),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=25)
def test_calcular_total_igual_soma_aritmetica(valores):
    """O resultado deve ser exatamente igual a soma de todos os valores de entrada."""
    componentes = make_componentes(valores)
    resultado = calcular_total(componentes)
    esperado = sum(valores, Decimal("0"))
    assert resultado == esperado, (
        f"calcular_total retornou {resultado}, esperado {esperado} "
        f"para valores {valores}"
    )


@given(
    st.lists(
        st.decimals(min_value=0, max_value=100000, places=2),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=25)
def test_calcular_total_sempre_nao_negativo(valores):
    """O resultado deve ser sempre >= 0 quando todos os inputs sao >= 0."""
    componentes = make_componentes(valores)
    resultado = calcular_total(componentes)
    assert resultado >= Decimal("0"), (
        f"calcular_total retornou {resultado} (negativo) para valores {valores}"
    )


@given(
    st.lists(
        st.decimals(min_value=0, max_value=100000, places=2),
        min_size=1,
        max_size=19,
    )
)
@settings(max_examples=25)
def test_calcular_total_adicionar_zero_nao_altera(valores):
    """Adicionar um componente com valor zero nao deve alterar o total."""
    componentes_sem_zero = make_componentes(valores)
    total_sem_zero = calcular_total(componentes_sem_zero)

    componentes_com_zero = make_componentes(valores + [Decimal("0")])
    total_com_zero = calcular_total(componentes_com_zero)

    assert total_sem_zero == total_com_zero, (
        f"Adicionar zero alterou o total: {total_sem_zero} != {total_com_zero}"
    )


# ---------------------------------------------------------------------------
# Propriedade 5: Rejeicao de Valores Negativos
# Valida: Requisitos 2.3
# ---------------------------------------------------------------------------

@given(st.decimals(max_value=Decimal("-0.01"), allow_nan=False, allow_infinity=False))
@settings(max_examples=25)
def test_componente_custo_rejeita_valor_negativo(valor_negativo):
    """
    **Validates: Requirements 2.3**

    Para qualquer valor monetario negativo, ComponenteCustoSchema deve
    levantar ValidationError, garantindo que valores negativos nunca
    sejam persistidos no sistema.
    """
    with pytest.raises(ValidationError):
        ComponenteCustoSchema(tipo="salario", valor=valor_negativo)
