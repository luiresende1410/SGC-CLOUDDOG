from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", response_model=List[schemas.BudgetDepartamentoResponse])
def listar_budgets(
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    departamento_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.BudgetDepartamento)
    if mes:
        query = query.filter(models.BudgetDepartamento.mes == mes)
    if ano:
        query = query.filter(models.BudgetDepartamento.ano == ano)
    if departamento_id:
        query = query.filter(models.BudgetDepartamento.departamento_id == departamento_id)
    return query.order_by(models.BudgetDepartamento.ano, models.BudgetDepartamento.mes).all()


@router.post("", response_model=schemas.BudgetDepartamentoResponse, status_code=status.HTTP_201_CREATED)
def criar_budget(
    dados: schemas.BudgetDepartamentoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    dept = db.query(models.Departamento).filter(models.Departamento.id == dados.departamento_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento nao encontrado.")

    existente = db.query(models.BudgetDepartamento).filter(
        models.BudgetDepartamento.departamento_id == dados.departamento_id,
        models.BudgetDepartamento.mes == dados.mes,
        models.BudgetDepartamento.ano == dados.ano,
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Budget ja definido para este departamento em {dados.mes:02d}/{dados.ano}.",
        )

    budget = models.BudgetDepartamento(**dados.model_dump())
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.put("/{budget_id}", response_model=schemas.BudgetDepartamentoResponse)
def atualizar_budget(
    budget_id: int,
    dados: schemas.BudgetDepartamentoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    budget = db.query(models.BudgetDepartamento).filter(models.BudgetDepartamento.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget nao encontrado.")
    budget.valor = dados.valor
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    budget = db.query(models.BudgetDepartamento).filter(models.BudgetDepartamento.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget nao encontrado.")
    db.delete(budget)
    db.commit()


@router.get("/comparacao", response_model=List[schemas.BudgetComparacaoItem])
def comparacao_budget(
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    departamentos = db.query(models.Departamento).all()
    resultado = []

    for dept in departamentos:
        budget = db.query(models.BudgetDepartamento).filter(
            models.BudgetDepartamento.departamento_id == dept.id,
            models.BudgetDepartamento.mes == mes,
            models.BudgetDepartamento.ano == ano,
        ).first()

        custo_real = Decimal("0")
        registros = (
            db.query(models.RegistroCusto)
            .join(models.Colaborador)
            .filter(
                models.Colaborador.departamento_id == dept.id,
                models.RegistroCusto.mes == mes,
                models.RegistroCusto.ano == ano,
            )
            .all()
        )
        for reg in registros:
            for comp in reg.componentes:
                custo_real += comp.valor

        if budget:
            diferenca = budget.valor - custo_real
            percentual = float(custo_real / budget.valor * 100) if budget.valor > 0 else 0
            status_budget = "abaixo" if custo_real <= budget.valor else "acima"
        else:
            diferenca = None
            percentual = None
            status_budget = "sem_budget"

        resultado.append(schemas.BudgetComparacaoItem(
            departamento_id=dept.id,
            departamento_nome=dept.nome,
            budget=budget.valor if budget else None,
            custo_real=custo_real,
            diferenca=diferenca,
            percentual_uso=percentual,
            status=status_budget,
        ))

    return sorted(resultado, key=lambda x: x.custo_real, reverse=True)


@router.post("/copiar")
def copiar_budgets(
    mes_origem: int,
    ano_origem: int,
    mes_destino: int,
    ano_destino: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    budgets_origem = db.query(models.BudgetDepartamento).filter(
        models.BudgetDepartamento.mes == mes_origem,
        models.BudgetDepartamento.ano == ano_origem,
    ).all()

    if not budgets_origem:
        raise HTTPException(status_code=404, detail=f"Nenhum budget encontrado para {mes_origem:02d}/{ano_origem}.")

    copiados = 0
    for b in budgets_origem:
        existente = db.query(models.BudgetDepartamento).filter(
            models.BudgetDepartamento.departamento_id == b.departamento_id,
            models.BudgetDepartamento.mes == mes_destino,
            models.BudgetDepartamento.ano == ano_destino,
        ).first()
        if not existente:
            novo = models.BudgetDepartamento(
                departamento_id=b.departamento_id,
                mes=mes_destino,
                ano=ano_destino,
                valor=b.valor,
            )
            db.add(novo)
            copiados += 1

    db.commit()
    return {"copiados": copiados, "total_origem": len(budgets_origem)}
