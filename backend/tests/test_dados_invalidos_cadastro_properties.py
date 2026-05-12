"""
Testes de propriedade para rejeição de dados inválidos no cadastro de colaboradores.

**Validates: Requirements 1.3**

Propriedade 2: Rejeição de Dados Inválidos no Cadastro
Para qualquer submissão de formulário de colaborador com pelo menos um campo
obrigatório ausente (nome, matricula, departamento_id, cargo, tipo_contrato,
data_admissao), o sistema deve rejeitar a operação sem persistir nenhum dado,
e o número total de colaboradores no banco deve permanecer inalterado.
"""

import datetime
import os
import uuid

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configura variáveis de ambiente antes de importar o app
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
    Cria banco SQLite em arquivo temporário com departamento e usuário de teste.
    Sobrescreve get_db e get_current_user para isolar o teste do banco real.

    Retorna (TestClient, departamento_id, Session).
    """
    db_path = str(tmp_path / f"test_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    # Seed: departamento e usuário necessários para os testes
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

    # Sobrescreve get_current_user para retornar usuário de teste sem validar JWT
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
# Payload base válido e estratégias Hypothesis
# ---------------------------------------------------------------------------

def _payload_completo(departamento_id: int) -> dict:
    """Retorna um payload válido e completo para criação de colaborador."""
    return {
        "nome": "Ana Silva",
        "matricula": f"MAT-{uuid.uuid4().hex[:8].upper()}",
        "departamento_id": departamento_id,
        "cargo": "Engenheira de Software",
        "tipo_contrato": "CLT",
        "data_admissao": "2023-03-01",
    }


# Campos obrigatórios do colaborador
CAMPOS_OBRIGATORIOS = [
    "nome",
    "matricula",
    "departamento_id",
    "cargo",
    "tipo_contrato",
    "data_admissao",
]

# Estratégia: gera subconjuntos não-vazios de campos obrigatórios para remover
campos_para_remover_strategy = st.lists(
    st.sampled_from(CAMPOS_OBRIGATORIOS),
    min_size=1,
    max_size=len(CAMPOS_OBRIGATORIOS),
    unique=True,
)


def _contar_colaboradores(Session) -> int:
    """Conta o número total de colaboradores no banco."""
    db = Session()
    try:
        return db.query(models.Colaborador).count()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Propriedade 2: Rejeição de Dados Inválidos no Cadastro
# Valida: Requisitos 1.3
# ---------------------------------------------------------------------------


@given(campos_ausentes=campos_para_remover_strategy)
@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_campos_obrigatorios_ausentes_retornam_422_sem_persistir(
    db_and_client,
    campos_ausentes,
):
    """
    **Validates: Requirements 1.3**

    Para qualquer submissão com pelo menos um campo obrigatório ausente,
    o sistema deve:
    1. Retornar HTTP 422 (Unprocessable Entity) — validação Pydantic.
    2. Não persistir nenhum dado: o número de colaboradores no banco
       deve permanecer inalterado após a tentativa.

    Verifica a propriedade para qualquer subconjunto de campos ausentes.
    """
    client, departamento_id, Session = db_and_client

    # Conta colaboradores antes da tentativa
    total_antes = _contar_colaboradores(Session)

    # Monta payload com campos obrigatórios removidos
    payload = _payload_completo(departamento_id)
    for campo in campos_ausentes:
        del payload[campo]

    # Tenta criar colaborador com dados inválidos
    response = client.post("/api/colaboradores", json=payload)

    # Deve rejeitar com HTTP 422 (Unprocessable Entity)
    assert response.status_code == 422, (
        f"Payload com campos ausentes {campos_ausentes} deveria retornar 422, "
        f"obtido {response.status_code}. Resposta: {response.text}"
    )

    # Nenhum dado deve ter sido persistido
    total_depois = _contar_colaboradores(Session)
    assert total_depois == total_antes, (
        f"O número de colaboradores mudou após rejeição: "
        f"antes={total_antes}, depois={total_depois}. "
        f"Campos ausentes: {campos_ausentes}"
    )


@given(
    campo_ausente=st.sampled_from(CAMPOS_OBRIGATORIOS),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_cada_campo_obrigatorio_individualmente_causa_rejeicao(
    db_and_client,
    campo_ausente,
):
    """
    **Validates: Requirements 1.3**

    Para cada campo obrigatório individualmente ausente, o sistema deve
    rejeitar a operação com HTTP 422 sem persistir dados.

    Verifica que nenhum campo obrigatório pode ser omitido isoladamente.
    """
    client, departamento_id, Session = db_and_client

    total_antes = _contar_colaboradores(Session)

    payload = _payload_completo(departamento_id)
    del payload[campo_ausente]

    response = client.post("/api/colaboradores", json=payload)

    assert response.status_code == 422, (
        f"Payload sem o campo '{campo_ausente}' deveria retornar 422, "
        f"obtido {response.status_code}. Resposta: {response.text}"
    )

    # Verifica que nenhum dado foi persistido
    total_depois = _contar_colaboradores(Session)
    assert total_depois == total_antes, (
        f"Dados foram persistidos indevidamente após rejeição por campo ausente "
        f"'{campo_ausente}': antes={total_antes}, depois={total_depois}"
    )


def test_payload_completo_e_aceito(db_and_client):
    """
    **Validates: Requirements 1.3**

    Verifica que um payload completo e válido é aceito com HTTP 201,
    servindo como controle positivo para os testes de rejeição.
    """
    client, departamento_id, Session = db_and_client

    total_antes = _contar_colaboradores(Session)

    payload = _payload_completo(departamento_id)
    response = client.post("/api/colaboradores", json=payload)

    assert response.status_code == 201, (
        f"Payload completo deveria retornar 201, "
        f"obtido {response.status_code}. Resposta: {response.text}"
    )

    # Verifica que o colaborador foi persistido
    total_depois = _contar_colaboradores(Session)
    assert total_depois == total_antes + 1, (
        f"Colaborador válido não foi persistido: antes={total_antes}, depois={total_depois}"
    )


def test_payload_vazio_retorna_422_sem_persistir(db_and_client):
    """
    **Validates: Requirements 1.3**

    Um payload completamente vazio deve ser rejeitado com HTTP 422
    sem persistir nenhum dado.
    """
    client, departamento_id, Session = db_and_client

    total_antes = _contar_colaboradores(Session)

    response = client.post("/api/colaboradores", json={})

    assert response.status_code == 422, (
        f"Payload vazio deveria retornar 422, "
        f"obtido {response.status_code}. Resposta: {response.text}"
    )

    total_depois = _contar_colaboradores(Session)
    assert total_depois == total_antes, (
        f"Dados foram persistidos com payload vazio: antes={total_antes}, depois={total_depois}"
    )


def test_resposta_422_contem_detalhes_dos_campos_invalidos(db_and_client):
    """
    **Validates: Requirements 1.3**

    A resposta HTTP 422 deve conter informações sobre quais campos
    estão ausentes ou inválidos, permitindo ao cliente identificar
    e corrigir os erros.
    """
    client, departamento_id, _ = db_and_client

    # Remove dois campos obrigatórios
    payload = _payload_completo(departamento_id)
    del payload["nome"]
    del payload["matricula"]

    response = client.post("/api/colaboradores", json=payload)

    assert response.status_code == 422

    data = response.json()
    assert "detail" in data, (
        f"Resposta 422 deve conter campo 'detail'. Obtido: {data}"
    )
    # O detail deve ser uma lista de erros de validação (padrão FastAPI/Pydantic)
    assert isinstance(data["detail"], list), (
        f"'detail' deve ser uma lista de erros. Obtido: {data['detail']}"
    )
    assert len(data["detail"]) > 0, (
        "A lista de erros não deve estar vazia para campos ausentes."
    )
