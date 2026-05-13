from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/departamentos", tags=["Departamentos"])

@router.get("", response_model=List[schemas.DepartamentoResponse])
def listar_departamentos(db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    return db.query(models.Departamento).all()

@router.post("", response_model=schemas.DepartamentoResponse, status_code=status.HTTP_201_CREATED)
def criar_departamento(dados: schemas.DepartamentoCreate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    if db.query(models.Departamento).filter(models.Departamento.nome == dados.nome).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Departamento '{dados.nome}' ja existe.")
    dept = models.Departamento(nome=dados.nome, budget_mensal=dados.budget_mensal)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.put("/{departamento_id}", response_model=schemas.DepartamentoResponse)
def atualizar_departamento(departamento_id: int, dados: schemas.DepartamentoUpdate, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento nao encontrado.")
    if db.query(models.Departamento).filter(models.Departamento.nome == dados.nome, models.Departamento.id != departamento_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Departamento '{dados.nome}' ja existe.")
    dept.nome = dados.nome
    dept.budget_mensal = dados.budget_mensal
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/{departamento_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_departamento(departamento_id: int, db: Session = Depends(get_db), current_user: models.Usuario = Depends(get_current_user)):
    dept = db.query(models.Departamento).filter(models.Departamento.id == departamento_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento nao encontrado.")
    count = db.query(models.Colaborador).filter(models.Colaborador.departamento_id == departamento_id).count()
    if count > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Nao e possivel excluir: ha {count} colaborador(es) vinculado(s).")
    db.delete(dept)
    db.commit()
