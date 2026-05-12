from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user, hash_senha
from app.database import get_db

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


def _require_admin(current_user: models.Usuario):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem executar esta acao.",
        )


@router.get("", response_model=List[schemas.UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Usuario).all()


@router.post("", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(
    dados: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    if db.query(models.Usuario).filter(models.Usuario.email == dados.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Email '{dados.email}' ja esta em uso.")
    usuario = models.Usuario(
        email=dados.email, nome=dados.nome,
        senha_hash=hash_senha(dados.senha), ativo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.put("/{usuario_id}", response_model=schemas.UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    dados: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado.")
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}/inativar", response_model=schemas.UsuarioResponse)
def inativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario nao encontrado.")
    if usuario.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Voce nao pode inativar sua propria conta.")
    usuario.ativo = False
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}/reset-senha", response_model=schemas.UsuarioResponse)
def reset_senha(
    usuario_id: int,
    dados: schemas.ResetSenhaRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    if not dados.nova_senha or len(dados.nova_senha) < 6:
        raise HTTPException(status_code=422, detail="A nova senha deve ter pelo menos 6 caracteres.")
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    usuario.senha_hash = hash_senha(dados.nova_senha)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}/perfil", response_model=schemas.UsuarioResponse)
def alterar_perfil(
    usuario_id: int,
    dados: schemas.AlterarPerfilRequest,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Promove ou rebaixa um usuario (admin <-> comum). Apenas admins podem fazer isso."""
    _require_admin(current_user)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    if usuario.id == current_user.id:
        raise HTTPException(status_code=400, detail="Voce nao pode alterar seu proprio perfil.")
    usuario.is_admin = dados.is_admin
    db.commit()
    db.refresh(usuario)
    return usuario

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Exclui permanentemente um usuario. Apenas admins. Nao e possivel excluir a si mesmo."""
    _require_admin(current_user)
    if usuario_id == current_user.id:
        raise HTTPException(status_code=400, detail="Voce nao pode excluir sua propria conta.")
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado.")
    db.delete(usuario)
    db.commit()
