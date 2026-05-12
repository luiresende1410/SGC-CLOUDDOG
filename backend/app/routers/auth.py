"""
Router de autenticacao: login, logout e dados do usuario autenticado.

Endpoints:
- POST /api/auth/login  -- autentica usuario, retorna JWT
- POST /api/auth/logout -- invalida token (blacklist)
- GET  /api/auth/me     -- retorna dados do usuario autenticado
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app import models, schemas
from app.auth import (
    criar_token,
    get_current_user,
    invalidar_token,
    verificar_senha,
)
from app.database import get_db

router = APIRouter(prefix="/auth", tags=["Autenticacao"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    dados: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    """Autentica usuario e retorna JWT. Resposta identica para qualquer falha."""
    # Mensagem generica para nao revelar qual campo falhou
    erro_generico = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais invalidas.",
    )

    usuario = db.query(models.Usuario).filter(
        models.Usuario.email == dados.email,
    ).first()

    # Verifica existencia, senha e status ativo -- mesma resposta para qualquer falha
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash) or not usuario.ativo:
        raise erro_generico

    token = criar_token(usuario.id, usuario.email)
    return schemas.TokenResponse(access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    current_user: models.Usuario = Depends(get_current_user),
):
    """Invalida o token atual adicionando-o a blacklist."""
    # Extrai o token do header Authorization
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        invalidar_token(token)


@router.get("/me", response_model=schemas.UsuarioResponse)
async def me(
    current_user: models.Usuario = Depends(get_current_user),
):
    """Retorna dados do usuario autenticado."""
    return current_user