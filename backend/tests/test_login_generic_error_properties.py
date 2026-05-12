"""
Testes de propriedade para mensagem generica de login invalido.

**Validates: Requirements 6.3**

Propriedade 12: Mensagem de Erro Generica em Login Invalido
Para qualquer par (email, senha) invalido -- seja email inexistente, senha
incorreta, ou usuario inativo -- a resposta da API deve ser identica:
HTTP 401 com a mesma mensagem generica, sem revelar qual campo especifico falhou.
"""

import os
import uuid

import bcrypt
import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configura variaveis de ambiente antes de importar o app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")

from app.database import Base, get_db
from app.main import app
from app.routers.auth import limiter as auth_limiter
from app import models


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_senha(senha: str) -> str:
    """Hash de senha usando bcrypt diretamente com custo baixo para testes."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt(rounds=4)).decode("utf-8")


# ---------------------------------------------------------------------------
# Fixtures de banco de dados em arquivo temporario (SQLite)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def db_and_client(tmp_path):
    """
    Cria banco SQLite em arquivo temporario com usuarios de teste e retorna
    (TestClient, email_ativo, senha_correta, email_inativo).

    Usa arquivo temporario em vez de :memory: para evitar problemas de
    threading do SQLite com o TestClient do FastAPI.
    O rate limiter do endpoint de login e desabilitado para permitir
    multiplas requisicoes nos testes de propriedade.
    """
    db_path = str(tmp_path / f"test_{uuid.uuid4().hex}.db")
    db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)

    # Seed: usuarios de teste
    senha_correta = "SenhaCorreta@123"
    session = Session()
    usuario_ativo = models.Usuario(
        email="ativo@clouddog.com.br",
        senha_hash=_hash_senha(senha_correta),
        nome="Usuario Ativo",
        ativo=True,
    )
    usuario_inativo = models.Usuario(
        email="inativo@clouddog.com.br",
        senha_hash=_hash_senha(senha_correta),
        nome="Usuario Inativo",
        ativo=False,
    )
    session.add_all([usuario_ativo, usuario_inativo])
    session.commit()
    session.close()

    # Sobrescreve a dependencia get_db para usar o banco de teste
    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Desabilita o rate limiter do router de auth para nao interferir nos testes
    auth_limiter.enabled = False

    with TestClient(app, raise_server_exceptions=False) as client:
        yield client, "ativo@clouddog.com.br", senha_correta, "inativo@clouddog.com.br"

    app.dependency_overrides.clear()
    auth_limiter.enabled = True
    engine.dispose()


# ---------------------------------------------------------------------------
# Estrategias Hypothesis
# ---------------------------------------------------------------------------

# Emails que nao existem no banco (prefixo "inexistente_" garante isso)
email_inexistente_strategy = st.builds(
    lambda local, domain: f"inexistente_{local}@{domain}",
    local=st.text(
        alphabet="abcdefghijklmnopqrstuvwxyz0123456789",
        min_size=3,
        max_size=20,
    ),
    domain=st.sampled_from(["exemplo.com", "teste.org", "naoexiste.net"]),
)

# Senhas incorretas (qualquer string que nao seja a senha correta)
senha_errada_strategy = st.text(
    alphabet=st.characters(blacklist_categories=("Cs",)),
    min_size=1,
    max_size=50,
).filter(lambda s: s != "SenhaCorreta@123")


# ---------------------------------------------------------------------------
# Propriedade 12: Mensagem de Erro Generica em Login Invalido
# Valida: Requisitos 6.3
# ---------------------------------------------------------------------------

@given(email=email_inexistente_strategy, senha=senha_errada_strategy)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_email_inexistente_retorna_401_generico(db_and_client, email, senha):
    """
    **Validates: Requirements 6.3**

    Para qualquer email que nao existe no banco, a resposta deve ser
    HTTP 401 com mensagem generica identica a dos outros casos de falha.
    """
    client, _, _, _ = db_and_client

    response = client.post("/api/auth/login", json={"email": email, "senha": senha})

    assert response.status_code == 401, (
        f"Esperado HTTP 401 para email inexistente '{email}', "
        f"obtido {response.status_code}"
    )
    data = response.json()
    assert "detail" in data, "Resposta deve conter campo 'detail'"
    assert data["detail"] == "Credenciais invalidas.", (
        f"Mensagem de erro deve ser generica. Obtido: '{data['detail']}'"
    )


@given(senha_errada=senha_errada_strategy)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_senha_errada_retorna_401_generico(db_and_client, senha_errada):
    """
    **Validates: Requirements 6.3**

    Para usuario existente e ativo com senha incorreta, a resposta deve ser
    HTTP 401 com mensagem generica identica a dos outros casos de falha.
    """
    client, email_ativo, _, _ = db_and_client

    response = client.post(
        "/api/auth/login", json={"email": email_ativo, "senha": senha_errada}
    )

    assert response.status_code == 401, (
        f"Esperado HTTP 401 para senha errada, obtido {response.status_code}"
    )
    data = response.json()
    assert "detail" in data, "Resposta deve conter campo 'detail'"
    assert data["detail"] == "Credenciais invalidas.", (
        f"Mensagem de erro deve ser generica. Obtido: '{data['detail']}'"
    )


def test_usuario_inativo_retorna_401_generico(db_and_client):
    """
    **Validates: Requirements 6.3**

    Para usuario inativo com credenciais corretas, a resposta deve ser
    HTTP 401 com mensagem generica identica a dos outros casos de falha.
    """
    client, _, senha_correta, email_inativo = db_and_client

    response = client.post(
        "/api/auth/login", json={"email": email_inativo, "senha": senha_correta}
    )

    assert response.status_code == 401, (
        f"Esperado HTTP 401 para usuario inativo, obtido {response.status_code}"
    )
    data = response.json()
    assert "detail" in data, "Resposta deve conter campo 'detail'"
    assert data["detail"] == "Credenciais invalidas.", (
        f"Mensagem de erro deve ser generica. Obtido: '{data['detail']}'"
    )


def test_respostas_identicas_para_todos_os_casos_de_falha(db_and_client):
    """
    **Validates: Requirements 6.3**

    Verifica que os tres casos de falha (email inexistente, senha errada,
    usuario inativo) retornam respostas identicas: mesmo status HTTP e
    mesmo corpo JSON, sem revelar qual campo especifico falhou.
    """
    client, email_ativo, senha_correta, email_inativo = db_and_client

    # Caso 1: email inexistente
    resp_email_inexistente = client.post(
        "/api/auth/login",
        json={"email": "naoexiste@clouddog.com.br", "senha": "qualquersenha"},
    )

    # Caso 2: senha errada (usuario ativo, email correto)
    resp_senha_errada = client.post(
        "/api/auth/login",
        json={"email": email_ativo, "senha": "SenhaErrada@999"},
    )

    # Caso 3: usuario inativo (credenciais corretas)
    resp_usuario_inativo = client.post(
        "/api/auth/login",
        json={"email": email_inativo, "senha": senha_correta},
    )

    respostas = [resp_email_inexistente, resp_senha_errada, resp_usuario_inativo]
    nomes = ["email_inexistente", "senha_errada", "usuario_inativo"]

    # Todos devem retornar HTTP 401
    for resp, nome in zip(respostas, nomes):
        assert resp.status_code == 401, (
            f"Caso '{nome}': esperado HTTP 401, obtido {resp.status_code}"
        )

    # Todos devem ter o mesmo corpo JSON
    corpos = [resp.json() for resp in respostas]
    corpo_referencia = corpos[0]

    for corpo, nome in zip(corpos[1:], nomes[1:]):
        assert corpo == corpo_referencia, (
            f"Caso '{nome}' retornou corpo diferente do caso de referencia.\n"
            f"Referencia: {corpo_referencia}\n"
            f"Obtido: {corpo}"
        )

    # A mensagem deve ser generica (nao revelar qual campo falhou)
    assert corpo_referencia.get("detail") == "Credenciais invalidas.", (
        f"Mensagem nao e generica: '{corpo_referencia.get('detail')}'"
    )
