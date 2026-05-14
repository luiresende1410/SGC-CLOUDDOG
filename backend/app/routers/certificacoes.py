"""
Router de certificacoes por colaborador.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/certificacoes", tags=["Certificacoes"])


@router.get("", response_model=List[schemas.CertificacaoResponse])
def listar_certificacoes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    return db.query(models.Certificacao).all()


@router.get("/colaborador/{colaborador_id}", response_model=List[schemas.CertificacaoResponse])
def listar_certificacoes_por_colaborador(
    colaborador_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")
    return db.query(models.Certificacao).filter(
        models.Certificacao.colaborador_id == colaborador_id
    ).all()


@router.post("", response_model=schemas.CertificacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_certificacao(
    dados: schemas.CertificacaoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == dados.colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")

    certificacao = models.Certificacao(**dados.model_dump())
    db.add(certificacao)
    db.commit()
    db.refresh(certificacao)
    return certificacao


@router.delete("/{certificacao_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_certificacao(
    certificacao_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    cert = db.query(models.Certificacao).filter(
        models.Certificacao.id == certificacao_id
    ).first()
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificacao nao encontrada.")
    db.delete(cert)
    db.commit()
