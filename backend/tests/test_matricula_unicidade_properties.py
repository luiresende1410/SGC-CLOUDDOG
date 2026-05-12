"""
Testes de propriedade para unicidade de matricula de colaboradores.

**Validates: Requirements 1.4**

Propriedade 1: Unicidade de Matricula
Para qualquer par de colaboradores com a mesma matricula, o sistema deve
rejeitar o segundo cadastro com HTTP 409 (Conflict), independentemente dos
outros campos do colaborador. A matricula e um identificador unico no sistema
e nao pode ser reutilizada por dois colaboradores distintos.
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

# Configura variaveis de ambiente antes de importar o app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-here!!")

from app.auth import criar_token, get_current_user
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

    Retorna (TestClient, departamento_id, token_valido).
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
        yield client, dep_id

    app.dependency_overrides.clear()
    engine.dispose()


# ---------------------------------------------------------------------------
# Estrategias Hypothesis
# ---------------------------------------------------------------------------

# Gera matriculas validas: alfanumericas com hifen, entre 3 e 20 caracteres
matricula_strategy = st.text(
    alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
    min_size=3,
    max_size=20,
)

# Gera nomes de colaboradores validos
nome_strategy = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ",
    min_size=3,
    max_size=50,
).map(str.strip).filter(lambda s: len(s) >= 3)

# Gera cargos validos
cargo_strategy = st.sampled_from([
    "Engenheiro de Software",
    "Analista de Dados",
    "Gerente de Projetos",
    "Designer UX",
    "DevOps Engineer",
])

# Gera datas de admissao validas (entre 2010 e 2024)
data_admissao_strategy = st.dates(
    min_value=datetime.date(2010, 1, 1),
    max_value=datetime.date(2024, 12, 31),
)

# Gera tipo de contrato valido
tipo_contrato_strategy = st.sampled_from(["CLT", "PJ"])


def _payload_colaborador(
    matricula: str,
    nome: str,
    cargo: str,
    data_admissao: datetime.date,
    tipo_contrato: str,
    departamento_id: int,
) -> dict:
    """Monta o payload JSON para criacao de colaborador."""
    return {
        "nome": nome,
        "matricula": matricula,
        "departamento_id": departamento_id,
        "cargo": cargo,
        "tipo_contrato": tipo_contrato,
        "data_admissao": data_admissao.isoformat(),
    }


# ---------------------------------------------------------------------------
# Propriedade 1: Unicidade de Matricula
# Valida: Requisitos 1.4
# ---------------------------------------------------------------------------


@given(
    matricula=matricula_strategy,
    nome1=nome_strategy,
    nome2=nome_strategy,
    cargo1=cargo_strategy,
    cargo2=cargo_strategy,
    data1=data_admissao_strategy,
    data2=data_admissao_strategy,
    tipo1=tipo_contrato_strategy,
    tipo2=tipo_contrato_strategy,
)
@settings(
    max_examples=50,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_segunda_matricula_duplicada_retorna_409(
    db_and_client,
    matricula,
    nome1,
    nome2,
    cargo1,
    cargo2,
    data1,
    data2,
    tipo1,
    tipo2,
):
    """
    **Validates: Requirements 1.4**

    Para qualquer par de colaboradores com a mesma matricula, o primeiro
    cadastro deve ser aceito (HTTP 201) e o segundo deve ser rejeitado
    com HTTP 409 (Conflict), independentemente dos outros campos.

    A propriedade verifica que a unicidade de matricula e sempre enforced
    pela API, para qualquer combinacao de dados dos colaboradores.
    """
    client, departamento_id = db_and_client

    payload1 = _payload_colaborador(
        matricula=matricula,
        nome=nome1,
        cargo=cargo1,
        data_admissao=data1,
        tipo_contrato=tipo1,
        departamento_id=departamento_id,
    )
    payload2 = _payload_colaborador(
        matricula=matricula,
        nome=nome2,
        cargo=cargo2,
        data_admissao=data2,
        tipo_contrato=tipo2,
        departamento_id=departamento_id,
    )

    # Primeiro cadastro: deve ser aceito com HTTP 201
    resp1 = client.post("/api/colaboradores", json=payload1)
    assert resp1.status_code == 201, (
        f"Primeiro cadastro com matricula '{matricula}' deveria retornar 201, "
        f"obtido {resp1.status_code}. Resposta: {resp1.text}"
    )

    # Segundo cadastro com mesma matricula: deve ser rejeitado com HTTP 409
    resp2 = client.post("/api/colaboradores", json=payload2)
    assert resp2.status_code == 409, (
        f"Segundo cadastro com matricula duplicada '{matricula}' deveria retornar 409, "
        f"obtido {resp2.status_code}. Resposta: {resp2.text}"
    )

    # A resposta de erro deve conter informacao sobre a matricula duplicada
    data = resp2.json()
    assert "detail" in data, (
        f"Resposta 409 deve conter campo 'detail'. Obtido: {data}"
    )

    # Limpa o colaborador criado para nao interferir em outros exemplos Hypothesis
    colaborador_id = resp1.json().get("id")
    if colaborador_id:
        from sqlalchemy import create_engine as _ce
        # Usa a sessao do override para limpar
        db_gen = app.dependency_overrides[get_db]()
        db = next(db_gen)
        try:
            db.query(models.Colaborador).filter(
                models.Colaborador.id == colaborador_id
            ).delete()
            db.commit()
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


@given(
    matricula=matricula_strategy,
    nome=nome_strategy,
    cargo=cargo_strategy,
    data=data_admissao_strategy,
    tipo=tipo_contrato_strategy,
    n_tentativas=st.integers(min_value=2, max_value=4),
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_n_tentativas_com_mesma_matricula_todas_rejeitadas_apos_primeira(
    db_and_client,
    matricula,
    nome,
    cargo,
    data,
    tipo,
    n_tentativas,
):
    """
    **Validates: Requirements 1.4**

    Para N tentativas de cadastro com a mesma matricula, apenas a primeira
    deve ser aceita (HTTP 201). Todas as tentativas subsequentes (2 a N)
    devem ser rejeitadas com HTTP 409.

    Verifica que a restricao de unicidade e mantida para qualquer numero
    de tentativas de duplicacao.
    """
    client, departamento_id = db_and_client

    payload = _payload_colaborador(
        matricula=matricula,
        nome=nome,
        cargo=cargo,
        data_admissao=data,
        tipo_contrato=tipo,
        departamento_id=departamento_id,
    )

    # Primeira tentativa: deve ser aceita
    resp_inicial = client.post("/api/colaboradores", json=payload)
    assert resp_inicial.status_code == 201, (
        f"Primeira tentativa com matricula '{matricula}' deveria retornar 201, "
        f"obtido {resp_inicial.status_code}. Resposta: {resp_inicial.text}"
    )

    colaborador_id = resp_inicial.json().get("id")

    # Tentativas subsequentes: todas devem ser rejeitadas com 409
    for i in range(1, n_tentativas):
        resp = client.post("/api/colaboradores", json=payload)
        assert resp.status_code == 409, (
            f"Tentativa {i + 1} com matricula duplicada '{matricula}' deveria retornar 409, "
            f"obtido {resp.status_code}. Resposta: {resp.text}"
        )

    # Limpa o colaborador criado
    if colaborador_id:
        db_gen = app.dependency_overrides[get_db]()
        db = next(db_gen)
        try:
            db.query(models.Colaborador).filter(
                models.Colaborador.id == colaborador_id
            ).delete()
            db.commit()
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass


@given(
    matricula1=matricula_strategy,
    matricula2=matricula_strategy,
    nome=nome_strategy,
    cargo=cargo_strategy,
    data=data_admissao_strategy,
    tipo=tipo_contrato_strategy,
)
@settings(
    max_examples=30,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
def test_matriculas_distintas_sao_aceitas(
    db_and_client,
    matricula1,
    matricula2,
    nome,
    cargo,
    data,
    tipo,
):
    """
    **Validates: Requirements 1.4**

    Para dois colaboradores com matriculas distintas, ambos os cadastros
    devem ser aceitos com HTTP 201. A restricao de unicidade nao deve
    impedir o cadastro de colaboradores com matriculas diferentes.
    """
    # Garante que as matriculas sao distintas
    if matricula1 == matricula2:
        return  # Pula este exemplo (nao e o caso de teste aqui)

    client, departamento_id = db_and_client

    payload1 = _payload_colaborador(
        matricula=matricula1,
        nome=nome,
        cargo=cargo,
        data_admissao=data,
        tipo_contrato=tipo,
        departamento_id=departamento_id,
    )
    payload2 = _payload_colaborador(
        matricula=matricula2,
        nome=nome,
        cargo=cargo,
        data_admissao=data,
        tipo_contrato=tipo,
        departamento_id=departamento_id,
    )

    resp1 = client.post("/api/colaboradores", json=payload1)
    resp2 = client.post("/api/colaboradores", json=payload2)

    assert resp1.status_code == 201, (
        f"Colaborador com matricula '{matricula1}' deveria ser aceito (201), "
        f"obtido {resp1.status_code}. Resposta: {resp1.text}"
    )
    assert resp2.status_code == 201, (
        f"Colaborador com matricula '{matricula2}' deveria ser aceito (201), "
        f"obtido {resp2.status_code}. Resposta: {resp2.text}"
    )

    # Limpa os colaboradores criados
    for resp in [resp1, resp2]:
        col_id = resp.json().get("id")
        if col_id:
            db_gen = app.dependency_overrides[get_db]()
            db = next(db_gen)
            try:
                db.query(models.Colaborador).filter(
                    models.Colaborador.id == col_id
                ).delete()
                db.commit()
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
