from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/tabela-salarial", tags=["Tabela Salarial"])

@router.get("", response_model=List[schemas.TabelaSalarialResponse])
def listar_tabela_salarial(
    cargo: Optional[str] = Query(None),
    ano: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.TabelaSalarial)
    if cargo:
        query = query.filter(models.TabelaSalarial.cargo.ilike(f"%{cargo}%"))
    if ano is not None:
        query = query.filter(models.TabelaSalarial.ano == ano)
    return query.all()

@router.post("", response_model=schemas.TabelaSalarialResponse, status_code=status.HTTP_201_CREATED)
def criar_entrada_salarial(dados: schemas.TabelaSalarialCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if db.query(models.TabelaSalarial).filter(
        models.TabelaSalarial.cargo == dados.cargo,
        models.TabelaSalarial.nivel == dados.nivel,
        models.TabelaSalarial.ano == dados.ano,
    ).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Entrada para cargo='{dados.cargo}', nivel='{dados.nivel}', ano={dados.ano} ja existe.")
    entrada = models.TabelaSalarial(**dados.model_dump())
    db.add(entrada)
    db.commit()
    db.refresh(entrada)
    return entrada

@router.put("/{entrada_id}", response_model=schemas.TabelaSalarialResponse)
def atualizar_entrada_salarial(entrada_id: int, dados: schemas.TabelaSalarialUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    entrada = db.query(models.TabelaSalarial).filter(models.TabelaSalarial.id == entrada_id).first()
    if not entrada:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada nao encontrada.")
    entrada.salario = dados.salario
    db.commit()
    db.refresh(entrada)
    return entrada

@router.delete("/{entrada_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_entrada_salarial(entrada_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    entrada = db.query(models.TabelaSalarial).filter(models.TabelaSalarial.id == entrada_id).first()
    if not entrada:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entrada nao encontrada.")
    db.delete(entrada)
    db.commit()
