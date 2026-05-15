from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/parametros", tags=["Parametros"])

@router.get("", response_model=List[schemas.ParametroCalculoResponse])
def listar_parametros(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.ParametroCalculo).order_by(models.ParametroCalculo.chave).all()

@router.post("", response_model=schemas.ParametroCalculoResponse, status_code=status.HTTP_201_CREATED)
def criar_parametro(dados: schemas.ParametroCalculoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    existente = db.query(models.ParametroCalculo).filter(models.ParametroCalculo.chave == dados.chave).first()
    if existente:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Parametro '{dados.chave}' ja existe.")
    parametro = models.ParametroCalculo(**dados.model_dump())
    db.add(parametro)
    db.commit()
    db.refresh(parametro)
    return parametro

@router.put("/{parametro_id}", response_model=schemas.ParametroCalculoResponse)
def atualizar_parametro(parametro_id: int, dados: schemas.ParametroCalculoUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    p = db.query(models.ParametroCalculo).filter(models.ParametroCalculo.id == parametro_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parametro nao encontrado.")
    novos = dados.model_dump(exclude_unset=True)
    for campo, valor in novos.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{parametro_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_parametro(parametro_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    p = db.query(models.ParametroCalculo).filter(models.ParametroCalculo.id == parametro_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parametro nao encontrado.")
    db.delete(p)
    db.commit()
