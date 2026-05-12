"""
Modulo de autenticacao JWT para o sistema CloudDog.

Responsabilidades:
- Criar tokens JWT com expiracao de 30 minutos
- Validar tokens JWT e verificar blacklist
- Prover dependencia FastAPI get_current_user
- Manter blacklist de tokens invalidados (logout) em memoria
- Hash e verificacao de senhas com bcrypt
"""

from datetime import datetime, timedelta, timezone

import bcrypt as _bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app import models

# Configuracoes JWT
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Blacklist de tokens invalidados (em memoria)
token_blacklist: set = set()

# Esquema de seguranca HTTP Bearer
security = HTTPBearer()


def hash_senha(senha: str) -> str:
    """Gera hash bcrypt da senha com fator de custo 12."""
    return _bcrypt.hashpw(senha.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")


def verificar_senha(senha_plain: str, senha_hash: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash."""
    try:
        return _bcrypt.checkpw(senha_plain.encode("utf-8"), senha_hash.encode("utf-8"))
    except Exception:
        return False


def criar_token(user_id: int, email: str) -> str:
    """Cria token JWT com expiracao de 30 minutos."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def validar_token(token: str) -> dict:
    """Valida token JWT e verifica se esta na blacklist."""
    if token in token_blacklist:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado.",
        )
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado.",
        )


def invalidar_token(token: str) -> None:
    """Adiciona token a blacklist (logout)."""
    token_blacklist.add(token)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Dependencia FastAPI que valida o token e retorna o usuario autenticado."""
    token = credentials.credentials
    payload = validar_token(token)

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado.",
        )

    user = db.query(models.Usuario).filter(
        models.Usuario.id == int(user_id),
        models.Usuario.ativo == True,
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou expirado.",
        )

    return user
