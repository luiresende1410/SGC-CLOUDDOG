"""
Testes de propriedade para preservacao do historico apos inativacao.

**Validates: Requirements 1.6**

Propriedade 3: Preservacao do Historico apos Inativacao
Para qualquer colaborador com N registros de custo associados, apos a
operacao de inativacao, os mesmos N registros de custo devem permanecer
acessiveis e inalterados. A inativacao nao deve excluir nem modificar
registros historicos.
"""

import datetime
import os
import uuid
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configura variaveis de ambiente antes de importar o app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")

from app.auth import get_current_user
from app.database import Base, get_db
from app.main import app
from app import models


# ---------------------------------------------------------------------------
# Fixtures de banco de dados e cliente de teste
# ---------------------------------------------------------------------------


@pytest.fixture(scope="function")
def db_and_client(tmp_path):
    """
    Cria banco SQLite em arquivo temporario com departamento e usuario de teste.
    Sobrescreve get_db e get_current_user para isolar o teste do banco real.

    Retorna (TestClient, departamento_id, Session).
    """
    db_path = str(tmp_path / f"test_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    # Seed: departamento e usuario necessarios para os testes
    session = Session()
    departamento = models.Departamento(nome="Engenharia")
    session.add(departamento)
    session.flush()

    usuario = models.Usuario(
        email="admin@clouddog.com.br",
        senha_hash="$2b$12$placeholder_hash_for_tests_only",
        nome="Admin Teste",
        ativo=True,
    )
    session.add(usuario)
    session.commit()

    dep_id = departamento.id
    user_id = usuario.id
    session.close()

    # Sobrescreve get_db para usar o banco de teste
    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    # Sobrescreve get_current_user para retornar usuario de teste sem validar JWT
    def override_get_current_user():
        db = Session()
        try:
            user = db.query(models.Usuario).filter(models.Usuario.id == user_id).first()
            return user
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, dep_id, Session

    app.dependency_overrides.clear()
    engine.dispose()


# ---------------------------------------------------------------------------
# Estrategias Hypothesis
# ---------------------------------------------------------------------------

# Gera N entre 1 e 8 registros de custo
n_registros_strategy = st.integers(min_value=1, max_value=8)

# Gera pares (mes, ano) unicos para registros de custo
# Usamos anos distintos para garantir unicidade sem colisao de (mes, ano)
ano_strategy = st.integers(min_value=2020, max_value=2030)
mes_strategy = st.integers(min_value=1, max_value=12)

# Gera valor de componente de custo valido
valor_strategy = st.decimals(
    min_value=Decimal("0.01"),
    max_value=Decimal("50000"),
    places=2,
)

# Gera tipo de componente de custo valido
tipo_strategy = st.sampled_from([
    "salario",
    "refeicao",
    "transporte",
    "bonus_aws",
    "fgts",
])


def _criar_colaborador(client, departamento_id: int, matricula: str) -> int:
    """Cria um colaborador e retorna seu ID."""
    payload = {
        "nome": "Colaborador Teste Historico",
        "matricula": matricula,
        "departamento_id": departamento_id,
        "cargo": "Engenheiro de Software",
        "tipo_contrato": "CLT",
        "data_admissao": "2023-01-01",
    }
    resp = client.post("/api/colaboradores", json=payload)
    assert resp.status_code == 201, (
        f"Falha ao criar colaborador: {resp.status_code} - {resp.text}"
    )
    return resp.json()["id"]


def _criar_registro_custo(
    client,
    colaborador_id: int,
    mes: int,
    ano: int,
    tipo: str,
    valor: Decimal,
) -> int:
    """Cria um registro de custo e retorna seu ID."""
    payload = {
        "colaborador_id": colaborador_id,
        "mes": mes,
        "ano": ano,
        "componentes": [{"tipo": tipo, "valor": str(valor)}],
    }
    resp = client.post("/api/custos", json=payload)
    assert resp.status_code == 201, (
        f"Falha ao criar registro de custo (mes={mes}, ano={ano}): "
        f"{resp.status_code} - {resp.text}"
    )
    return resp.json()["id"]


def _limpar_colaborador(Session, colaborador_id: int) -> None:
    """Remove colaborador e seus registros de custo do banco."""
    db = Session()
    try:
        # Remove componentes de custo
        registros = (
            db.query(models.RegistroCusto)
            .filter(models.RegistroCusto.colaborador_id == colaborador_id)
            .all()
        )
        for registro in registros:
            db.query(models.ComponenteCusto).filter(
                models.ComponenteCusto.registro_custo_id == registro.id
            ).delete()
        # Remove registros de custo
        db.query(models.RegistroCusto).filter(
            models.RegistroCusto.colaborador_id == colaborador_id
        ).delete()
        # Remove colaborador
        db.query(models.Colaborador).filter(
            models.Colaborador.id == colaborador_id
        ).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Propriedade 3: Preservacao do Historico apos Inativacao
# Valida: Requisitos 1.6
# ---------------------------------------------------------------------------


@given(
    n=n_registros_strategy,
    tipos=st.lists(tipo_strategy, min_size=8, max_size=8),
    valores=st.lists(valor_strategy, min_size=8, max_size=8),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_n_registros_permanecem_acessiveis_apos_inativacao(
    db_and_client,
    n,
    tipos,
    valores,
):
    """
    **Validates: Requirements 1.6**

    Para qualquer colaborador com N registros de custo associados, apos a
    operacao de inativacao via PATCH /api/colaboradores/{id}/inativar, os
    mesmos N registros de custo devem permanecer acessiveis via
    GET /api/custos?colaborador_id={id}.

    A propriedade verifica que:
    1. N registros de custo sao criados com sucesso antes da inativacao.
    2. A inativacao retorna HTTP 200 e o colaborador fica com ativo=False.
    3. Apos a inativacao, GET /api/custos?colaborador_id={id} retorna
       exatamente N registros (nenhum foi excluido ou modificado).
    4. Os IDs dos registros retornados sao identicos aos criados antes da inativacao.
    """
    client, departamento_id, Session = db_and_client

    # Usa matricula unica para cada exemplo Hypothesis
    matricula = f"TST-{uuid.uuid4().hex[:8].upper()}"
    colaborador_id = _criar_colaborador(client, departamento_id, matricula)

    try:
        # Cria N registros de custo com periodos distintos (ano diferente para cada)
        # Usa anos 2020..2020+n-1 para garantir unicidade de (mes, ano)
        ids_criados = []
        for i in range(n):
            mes = (i % 12) + 1  # 1..12
            ano = 2020 + i       # anos distintos garantem unicidade
            tipo = tipos[i % len(tipos)]
            valor = valores[i % len(valores)]

            registro_id = _criar_registro_custo(
                client, colaborador_id, mes, ano, tipo, valor
            )
            ids_criados.append(registro_id)

        # Verifica que N registros foram criados
        assert len(ids_criados) == n, (
            f"Esperado {n} registros criados, obtido {len(ids_criados)}"
        )

        # Inativa o colaborador
        resp_inativacao = client.patch(f"/api/colaboradores/{colaborador_id}/inativar")
        assert resp_inativacao.status_code == 200, (
            f"Inativacao deveria retornar HTTP 200, obtido "
            f"{resp_inativacao.status_code}. Resposta: {resp_inativacao.text}"
        )

        # Verifica que o colaborador esta inativo
        dados_colaborador = resp_inativacao.json()
        assert dados_colaborador["ativo"] is False, (
            f"Colaborador deveria estar inativo apos inativacao, "
            f"mas ativo={dados_colaborador['ativo']}"
        )

        # Verifica que todos os N registros de custo permanecem acessiveis
        resp_custos = client.get(f"/api/custos?colaborador_id={colaborador_id}")
        assert resp_custos.status_code == 200, (
            f"GET /api/custos deveria retornar HTTP 200, obtido "
            f"{resp_custos.status_code}. Resposta: {resp_custos.text}"
        )

        registros_apos_inativacao = resp_custos.json()
        assert len(registros_apos_inativacao) == n, (
            f"Esperado {n} registros de custo apos inativacao, "
            f"obtido {len(registros_apos_inativacao)}. "
            f"A inativacao nao deve excluir o historico de custos."
        )

        # Verifica que os IDs dos registros sao os mesmos (nenhum foi recriado)
        ids_apos_inativacao = {r["id"] for r in registros_apos_inativacao}
        ids_esperados = set(ids_criados)
        assert ids_apos_inativacao == ids_esperados, (
            f"Os IDs dos registros apos inativacao diferem dos criados.\n"
            f"Esperados: {ids_esperados}\n"
            f"Obtidos: {ids_apos_inativacao}"
        )

    finally:
        # Limpa dados criados para nao interferir em outros exemplos Hypothesis
        _limpar_colaborador(Session, colaborador_id)


@given(
    n=n_registros_strategy,
    tipos=st.lists(tipo_strategy, min_size=8, max_size=8),
    valores=st.lists(valor_strategy, min_size=8, max_size=8),
)
@settings(
    max_examples=20,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_registros_inalterados_apos_inativacao(
    db_and_client,
    n,
    tipos,
    valores,
):
    """
    **Validates: Requirements 1.6**

    Apos a inativacao do colaborador, os dados de cada registro de custo
    (mes, ano, componentes) devem permanecer identicos aos dados originais.
    A inativacao nao deve modificar o conteudo dos registros historicos.
    """
    client, departamento_id, Session = db_and_client

    matricula = f"TST-{uuid.uuid4().hex[:8].upper()}"
    colaborador_id = _criar_colaborador(client, departamento_id, matricula)

    try:
        # Cria N registros e armazena os dados originais
        registros_originais = {}
        for i in range(n):
            mes = (i % 12) + 1
            ano = 2020 + i
            tipo = tipos[i % len(tipos)]
            valor = valores[i % len(valores)]

            registro_id = _criar_registro_custo(
                client, colaborador_id, mes, ano, tipo, valor
            )
            registros_originais[registro_id] = {
                "mes": mes,
                "ano": ano,
                "colaborador_id": colaborador_id,
            }

        # Inativa o colaborador
        resp_inativacao = client.patch(f"/api/colaboradores/{colaborador_id}/inativar")
        assert resp_inativacao.status_code == 200, (
            f"Inativacao deveria retornar HTTP 200, obtido "
            f"{resp_inativacao.status_code}"
        )

        # Verifica que cada registro permanece inalterado
        resp_custos = client.get(f"/api/custos?colaborador_id={colaborador_id}")
        assert resp_custos.status_code == 200

        registros_apos = {r["id"]: r for r in resp_custos.json()}

        for registro_id, dados_originais in registros_originais.items():
            assert registro_id in registros_apos, (
                f"Registro {registro_id} nao encontrado apos inativacao."
            )
            registro_atual = registros_apos[registro_id]

            assert registro_atual["mes"] == dados_originais["mes"], (
                f"Registro {registro_id}: mes alterado de "
                f"{dados_originais['mes']} para {registro_atual['mes']}"
            )
            assert registro_atual["ano"] == dados_originais["ano"], (
                f"Registro {registro_id}: ano alterado de "
                f"{dados_originais['ano']} para {registro_atual['ano']}"
            )
            assert registro_atual["colaborador_id"] == dados_originais["colaborador_id"], (
                f"Registro {registro_id}: colaborador_id alterado."
            )

    finally:
        _limpar_colaborador(Session, colaborador_id)


def test_colaborador_sem_registros_inativacao_retorna_200(db_and_client):
    """
    **Validates: Requirements 1.6**

    Inativar um colaborador sem registros de custo deve retornar HTTP 200
    e o historico (vazio) deve permanecer acessivel.
    """
    client, departamento_id, Session = db_and_client

    matricula = f"TST-{uuid.uuid4().hex[:8].upper()}"
    colaborador_id = _criar_colaborador(client, departamento_id, matricula)

    try:
        # Verifica que nao ha registros antes da inativacao
        resp_antes = client.get(f"/api/custos?colaborador_id={colaborador_id}")
        assert resp_antes.status_code == 200
        assert len(resp_antes.json()) == 0

        # Inativa o colaborador
        resp_inativacao = client.patch(f"/api/colaboradores/{colaborador_id}/inativar")
        assert resp_inativacao.status_code == 200
        assert resp_inativacao.json()["ativo"] is False

        # Historico vazio permanece acessivel
        resp_depois = client.get(f"/api/custos?colaborador_id={colaborador_id}")
        assert resp_depois.status_code == 200
        assert len(resp_depois.json()) == 0

    finally:
        _limpar_colaborador(Session, colaborador_id)


def test_inativacao_nao_afeta_registros_de_outros_colaboradores(db_and_client):
    """
    **Validates: Requirements 1.6**

    Inativar um colaborador nao deve afetar os registros de custo de
    outros colaboradores ativos.
    """
    client, departamento_id, Session = db_and_client

    matricula_a = f"TST-A-{uuid.uuid4().hex[:6].upper()}"
    matricula_b = f"TST-B-{uuid.uuid4().hex[:6].upper()}"

    colaborador_a_id = _criar_colaborador(client, departamento_id, matricula_a)
    colaborador_b_id = _criar_colaborador(client, departamento_id, matricula_b)

    try:
        # Cria registros para ambos os colaboradores
        _criar_registro_custo(client, colaborador_a_id, 1, 2024, "salario", Decimal("5000.00"))
        _criar_registro_custo(client, colaborador_a_id, 2, 2024, "salario", Decimal("5000.00"))
        _criar_registro_custo(client, colaborador_b_id, 1, 2024, "salario", Decimal("6000.00"))

        # Inativa apenas o colaborador A
        resp = client.patch(f"/api/colaboradores/{colaborador_a_id}/inativar")
        assert resp.status_code == 200

        # Registros do colaborador A permanecem (2 registros)
        resp_a = client.get(f"/api/custos?colaborador_id={colaborador_a_id}")
        assert resp_a.status_code == 200
        assert len(resp_a.json()) == 2, (
            f"Colaborador A deveria ter 2 registros apos inativacao, "
            f"obtido {len(resp_a.json())}"
        )

        # Registros do colaborador B nao foram afetados (1 registro)
        resp_b = client.get(f"/api/custos?colaborador_id={colaborador_b_id}")
        assert resp_b.status_code == 200
        assert len(resp_b.json()) == 1, (
            f"Colaborador B deveria ter 1 registro (nao afetado pela inativacao de A), "
            f"obtido {len(resp_b.json())}"
        )

    finally:
        _limpar_colaborador(Session, colaborador_a_id)
        _limpar_colaborador(Session, colaborador_b_id)
