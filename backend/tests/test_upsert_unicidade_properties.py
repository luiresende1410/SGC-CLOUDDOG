"""
Testes de propriedade para unicidade de registro por periodo (Upsert).

**Validates: Requirements 2.5**

Propriedade 6: Unicidade de Registro por Periodo (Upsert)
Para qualquer combinacao (colaborador_id, mes, ano), o banco de dados deve
conter no maximo um registro de custo. Submeter um segundo registro para a
mesma combinacao deve atualizar o registro existente, nao criar um duplicado.
Apos N submissoes para a mesma combinacao, deve existir exatamente 1 registro.
"""

import datetime
from decimal import Decimal

import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models
from app.schemas import ComponenteCustoSchema, RegistroCustoCreate
from app.services.custo_service import upsert_registro_custo


# ---------------------------------------------------------------------------
# Fixtures de banco de dados em memoria (SQLite)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db_session():
    """Cria um banco SQLite em memoria para cada teste, com todas as tabelas."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed: departamento e colaborador necessarios para FK
    departamento = models.Departamento(nome="Desenvolvimento")
    session.add(departamento)
    session.flush()

    colaborador = models.Colaborador(
        nome="Colaborador Teste",
        matricula="TEST-001",
        departamento_id=departamento.id,
        cargo="Engenheiro",
        tipo_contrato="CLT",
        data_admissao=datetime.date(2023, 1, 1),
    )
    session.add(colaborador)
    session.commit()

    yield session, colaborador.id

    session.close()
    Base.metadata.drop_all(engine)


# ---------------------------------------------------------------------------
# Estrategias Hypothesis
# ---------------------------------------------------------------------------

# Gera listas de componentes validos (valor >= 0)
componentes_strategy = st.lists(
    st.builds(
        ComponenteCustoSchema,
        tipo=st.sampled_from(["salario", "refeicao", "transporte", "bonus_aws"]),
        valor=st.decimals(min_value=Decimal("0"), max_value=Decimal("100000"), places=2),
    ),
    min_size=1,
    max_size=5,
)

# Gera numero de submissoes entre 2 e 5
n_submissoes_strategy = st.integers(min_value=2, max_value=5)


# ---------------------------------------------------------------------------
# Propriedade 6: Unicidade de Registro por Periodo (Upsert)
# Valida: Requisitos 2.5
# ---------------------------------------------------------------------------

@given(
    mes=st.integers(min_value=1, max_value=12),
    ano=st.integers(min_value=2020, max_value=2030),
    n=n_submissoes_strategy,
    lista_componentes=st.lists(componentes_strategy, min_size=2, max_size=5),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_n_submissoes_resultam_em_exatamente_1_registro(
    db_session, mes, ano, n, lista_componentes
):
    """
    **Validates: Requirements 2.5**

    Para qualquer combinacao (colaborador_id, mes, ano), N submissoes devem
    resultar em exatamente 1 registro no banco de dados.
    """
    session, colaborador_id = db_session

    # Garante que temos pelo menos n listas de componentes (reutiliza ciclicamente)
    componentes_por_submissao = [
        lista_componentes[i % len(lista_componentes)] for i in range(n)
    ]

    # Realiza N submissoes para a mesma combinacao (colaborador_id, mes, ano)
    ultimo_registro = None
    for componentes in componentes_por_submissao:
        dados = RegistroCustoCreate(
            colaborador_id=colaborador_id,
            mes=mes,
            ano=ano,
            componentes=componentes,
        )
        ultimo_registro = upsert_registro_custo(session, dados)

    # Verifica que existe exatamente 1 registro para a combinacao
    count = (
        session.query(models.RegistroCusto)
        .filter(
            models.RegistroCusto.colaborador_id == colaborador_id,
            models.RegistroCusto.mes == mes,
            models.RegistroCusto.ano == ano,
        )
        .count()
    )

    assert count == 1, (
        f"Esperado exatamente 1 registro apos {n} submissoes para "
        f"(colaborador_id={colaborador_id}, mes={mes}, ano={ano}), "
        f"mas encontrado {count} registros."
    )

    # Verifica que o ID do registro e consistente (mesmo registro atualizado)
    assert ultimo_registro is not None
    registro_no_banco = (
        session.query(models.RegistroCusto)
        .filter(
            models.RegistroCusto.colaborador_id == colaborador_id,
            models.RegistroCusto.mes == mes,
            models.RegistroCusto.ano == ano,
        )
        .first()
    )
    assert registro_no_banco.id == ultimo_registro.id, (
        f"O ID do registro retornado ({ultimo_registro.id}) difere do "
        f"registro encontrado no banco ({registro_no_banco.id})."
    )

    # Limpa o registro criado para nao interferir em outros exemplos Hypothesis
    session.query(models.ComponenteCusto).filter(
        models.ComponenteCusto.registro_custo_id == registro_no_banco.id
    ).delete()
    session.query(models.RegistroCusto).filter(
        models.RegistroCusto.id == registro_no_banco.id
    ).delete()
    session.commit()


@given(
    mes=st.integers(min_value=1, max_value=12),
    ano=st.integers(min_value=2020, max_value=2030),
    componentes_iniciais=componentes_strategy,
    componentes_atualizados=componentes_strategy,
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_segunda_submissao_atualiza_componentes(
    db_session, mes, ano, componentes_iniciais, componentes_atualizados
):
    """
    **Validates: Requirements 2.5**

    Uma segunda submissao para a mesma combinacao deve atualizar os componentes
    do registro existente, nao criar um novo registro.
    """
    session, colaborador_id = db_session

    # Primeira submissao
    dados_iniciais = RegistroCustoCreate(
        colaborador_id=colaborador_id,
        mes=mes,
        ano=ano,
        componentes=componentes_iniciais,
    )
    registro_inicial = upsert_registro_custo(session, dados_iniciais)
    id_inicial = registro_inicial.id

    # Segunda submissao com componentes diferentes
    dados_atualizados = RegistroCustoCreate(
        colaborador_id=colaborador_id,
        mes=mes,
        ano=ano,
        componentes=componentes_atualizados,
    )
    registro_atualizado = upsert_registro_custo(session, dados_atualizados)

    # Deve ser o mesmo registro (mesmo ID)
    assert registro_atualizado.id == id_inicial, (
        f"Segunda submissao criou novo registro (id={registro_atualizado.id}) "
        f"em vez de atualizar o existente (id={id_inicial})."
    )

    # Deve existir exatamente 1 registro
    count = (
        session.query(models.RegistroCusto)
        .filter(
            models.RegistroCusto.colaborador_id == colaborador_id,
            models.RegistroCusto.mes == mes,
            models.RegistroCusto.ano == ano,
        )
        .count()
    )
    assert count == 1, (
        f"Esperado 1 registro apos 2 submissoes, encontrado {count}."
    )

    # Os componentes devem refletir a segunda submissao
    componentes_no_banco = (
        session.query(models.ComponenteCusto)
        .filter(
            models.ComponenteCusto.registro_custo_id == registro_atualizado.id
        )
        .all()
    )
    assert len(componentes_no_banco) == len(componentes_atualizados), (
        f"Numero de componentes no banco ({len(componentes_no_banco)}) "
        f"difere dos componentes da segunda submissao ({len(componentes_atualizados)})."
    )

    # Limpa para nao interferir em outros exemplos Hypothesis
    session.query(models.ComponenteCusto).filter(
        models.ComponenteCusto.registro_custo_id == registro_atualizado.id
    ).delete()
    session.query(models.RegistroCusto).filter(
        models.RegistroCusto.id == registro_atualizado.id
    ).delete()
    session.commit()
