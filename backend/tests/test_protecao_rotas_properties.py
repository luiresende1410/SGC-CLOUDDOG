"""
Testes de propriedade para protecao de rotas autenticadas.

**Validates: Requirements 6.1, 7.7**

Propriedade 11: Protecao de Rotas Autenticadas
Para qualquer endpoint protegido da API, uma requisicao sem token JWT valido
(ausente, expirado ou na blacklist) deve retornar HTTP 401. Nenhum dado deve
ser retornado ou modificado para requisicoes nao autenticadas.
"""

import os
import time
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from jose import jwt

# Configura DATABASE_URL para SQLite em memoria antes de importar o app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")

from app.main import app
from app.auth import token_blacklist

# ---------------------------------------------------------------------------
# Endpoints protegidos da API (metodo, path)
# ---------------------------------------------------------------------------

PROTECTED_ENDPOINTS = [
    ("GET",    "/api/colaboradores"),
    ("GET",    "/api/custos"),
    ("GET",    "/api/relatorios/colaboradores?mes=1&ano=2025"),
    ("GET",    "/api/relatorios/departamentos?mes=1&ano=2025"),
    ("GET",    "/api/departamentos"),
    ("GET",    "/api/parametros"),
    ("GET",    "/api/tabela-salarial"),
    ("GET",    "/api/usuarios"),
    ("GET",    "/api/auth/me"),
]

# ---------------------------------------------------------------------------
# Estrategias Hypothesis para tokens invalidos
# ---------------------------------------------------------------------------

# Strings aleatorias que nao sao JWTs validos (apenas ASCII para compatibilidade com headers HTTP)
token_aleatorio_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),
        whitelist_characters=".-_",
        max_codepoint=127,
    ),
    min_size=1,
    max_size=200,
)

# Tokens com estrutura JWT mas assinatura invalida (chave errada)
@st.composite
def token_assinatura_invalida_strategy(draw):
    """Gera token JWT com chave secreta errada."""
    chave_errada = draw(
        st.text(min_size=32, max_size=64, alphabet="abcdefghijklmnopqrstuvwxyz0123456789")
    )
    # Garante que a chave errada e diferente da chave correta
    chave_correta = os.environ.get("JWT_SECRET_KEY", "")
    if chave_errada == chave_correta:
        chave_errada = chave_errada + "_diferente"

    payload = {
        "sub": "1",
        "email": "test@test.com",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, chave_errada, algorithm="HS256")


# Tokens JWT expirados (com chave correta mas exp no passado)
@st.composite
def token_expirado_strategy(draw):
    """Gera token JWT expirado com a chave correta."""
    segundos_atras = draw(st.integers(min_value=1, max_value=86400))
    chave = os.environ.get("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")
    payload = {
        "sub": "1",
        "email": "test@test.com",
        "exp": datetime.now(timezone.utc) - timedelta(seconds=segundos_atras),
        "iat": datetime.now(timezone.utc) - timedelta(seconds=segundos_atras + 60),
    }
    return jwt.encode(payload, chave, algorithm="HS256")


# ---------------------------------------------------------------------------
# Fixture do cliente de teste
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def test_client():
    """Cliente de teste FastAPI com banco SQLite em memoria."""
    with TestClient(app, raise_server_exceptions=False) as client:
        yield client


# ---------------------------------------------------------------------------
# Propriedade 11: Protecao de Rotas Autenticadas
# Valida: Requisitos 6.1, 7.7
# ---------------------------------------------------------------------------


@given(
    endpoint=st.sampled_from(PROTECTED_ENDPOINTS),
    token=token_aleatorio_strategy,
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_token_aleatorio_retorna_401(endpoint, token):
    """
    **Validates: Requirements 6.1, 7.7**

    Para qualquer string aleatoria usada como token Bearer,
    todos os endpoints protegidos devem retornar HTTP 401.
    """
    metodo, path = endpoint
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.request(
            metodo,
            path,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 401, (
        f"Endpoint {metodo} {path} retornou {response.status_code} "
        f"com token aleatorio '{token[:30]}...', esperado 401."
    )


@given(
    endpoint=st.sampled_from(PROTECTED_ENDPOINTS),
    token=token_assinatura_invalida_strategy(),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_token_assinatura_invalida_retorna_401(endpoint, token):
    """
    **Validates: Requirements 6.1, 7.7**

    Para qualquer token JWT com assinatura invalida (chave errada),
    todos os endpoints protegidos devem retornar HTTP 401.
    """
    metodo, path = endpoint
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.request(
            metodo,
            path,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 401, (
        f"Endpoint {metodo} {path} retornou {response.status_code} "
        f"com token de assinatura invalida, esperado 401."
    )


@given(
    endpoint=st.sampled_from(PROTECTED_ENDPOINTS),
    token=token_expirado_strategy(),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_token_expirado_retorna_401(endpoint, token):
    """
    **Validates: Requirements 6.1, 7.7**

    Para qualquer token JWT expirado (mesmo com chave correta),
    todos os endpoints protegidos devem retornar HTTP 401.
    """
    metodo, path = endpoint
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.request(
            metodo,
            path,
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 401, (
        f"Endpoint {metodo} {path} retornou {response.status_code} "
        f"com token expirado, esperado 401."
    )


@given(endpoint=st.sampled_from(PROTECTED_ENDPOINTS))
@settings(
    max_examples=9,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_sem_token_retorna_401(endpoint):
    """
    **Validates: Requirements 6.1, 7.7**

    Para qualquer endpoint protegido, uma requisicao sem header Authorization
    deve retornar HTTP 401 (ou 403 do HTTPBearer do FastAPI).
    """
    metodo, path = endpoint
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.request(metodo, path)
    # FastAPI HTTPBearer retorna 403 quando o header esta ausente
    assert response.status_code in (401, 403), (
        f"Endpoint {metodo} {path} retornou {response.status_code} "
        f"sem token, esperado 401 ou 403."
    )


@given(endpoint=st.sampled_from(PROTECTED_ENDPOINTS))
@settings(
    max_examples=9,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_token_na_blacklist_retorna_401(endpoint):
    """
    **Validates: Requirements 6.1, 7.7**

    Para qualquer endpoint protegido, um token valido que foi invalidado
    (adicionado a blacklist via logout) deve retornar HTTP 401.
    """
    chave = os.environ.get("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")
    payload = {
        "sub": "999",
        "email": "blacklisted@test.com",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, chave, algorithm="HS256")

    # Adiciona o token a blacklist (simula logout)
    token_blacklist.add(token)

    try:
        metodo, path = endpoint
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.request(
                metodo,
                path,
                headers={"Authorization": f"Bearer {token}"},
            )
        assert response.status_code == 401, (
            f"Endpoint {metodo} {path} retornou {response.status_code} "
            f"com token na blacklist, esperado 401."
        )
    finally:
        # Limpa a blacklist apos o teste
        token_blacklist.discard(token)

