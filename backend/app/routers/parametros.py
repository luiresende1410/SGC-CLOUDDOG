from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/parametros", tags=["Parametros"])

@router.get("", response_model=List[schemas.ParametroCalculoResponse])
def listar_parametros(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.ParametroCalculo).all()

@router.put("/{parametro_id}", response_model=schemas.ParametroCalculoResponse)
def atualizar_parametro(parametro_id: int, dados: schemas.ParametroCalculoUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    p = db.query(models.ParametroCalculo).filter(models.ParametroCalculo.id == parametro_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parametro nao encontrado.")
    p.valor = dados.valor
    if dados.descricao is not None:
        p.descricao = dados.descricao
    db.commit()
    db.refresh(p)
    return p
