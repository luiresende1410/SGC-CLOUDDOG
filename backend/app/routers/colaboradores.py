"""
Router de colaboradores: CRUD completo com historico de eventos.

Endpoints:
- GET    /colaboradores                    -- listagem com filtros
- POST   /colaboradores                    -- criacao (registra evento admissao)
- GET    /colaboradores/{id}               -- busca por ID
- PUT    /colaboradores/{id}               -- atualizacao (registra evento automaticamente)
- PATCH  /colaboradores/{id}/inativar      -- inativacao com data
- GET    /colaboradores/{id}/historico     -- historico de eventos
- POST   /colaboradores/{id}/historico     -- adiciona evento manual
"""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/colaboradores", tags=["Colaboradores"])


def _classificar_nivel(db: Session, salario_base) -> str | None:
    """Classifica o nivel do colaborador com base na tabela salarial do ano atual."""
    if not salario_base or float(salario_base) <= 0:
        return None
    from sqlalchemy import func
    ano_atual = date.today().year
    # Busca niveis da tabela salarial agrupados por nivel com max salario
    niveis = (
        db.query(
            models.TabelaSalarial.nivel,
            func.max(models.TabelaSalarial.salario).label("max_salario")
        )
        .filter(models.TabelaSalarial.ano == ano_atual)
        .group_by(models.TabelaSalarial.nivel)
        .order_by(func.max(models.TabelaSalarial.salario))
        .all()
    )
    if not niveis:
        return None
    salario = float(salario_base)
    for nivel_row in niveis:
        if salario <= float(nivel_row.max_salario):
            return nivel_row.nivel
    # Se esta acima de todos, retorna o maior nivel
    return niveis[-1].nivel


def _registrar_evento(
    db: Session,
    colaborador: models.Colaborador,
    tipo_evento: str,
    data_evento: date,
    dados_anteriores: dict,
    dados_novos: dict,
    observacao: Optional[str],
    criado_por: Optional[int],
):
    """Cria um registro de historico se houver mudancas relevantes."""
    evento = models.HistoricoColaborador(
        colaborador_id=colaborador.id,
        tipo_evento=tipo_evento,
        data_evento=data_evento,
        cargo_anterior=dados_anteriores.get("cargo"),
        cargo_novo=dados_novos.get("cargo"),
        nivel_anterior=dados_anteriores.get("nivel"),
        nivel_novo=dados_novos.get("nivel"),
        tipo_contrato_anterior=dados_anteriores.get("tipo_contrato"),
        tipo_contrato_novo=dados_novos.get("tipo_contrato"),
        departamento_anterior=dados_anteriores.get("departamento"),
        departamento_novo=dados_novos.get("departamento"),
        observacao=observacao,
        criado_por=criado_por,
    )
    db.add(evento)


@router.get("", response_model=List[schemas.ColaboradorResponse])
def listar_colaboradores(
    q: Optional[str] = Query(None),
    departamento_id: Optional[int] = Query(None),
    ativo: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    query = db.query(models.Colaborador)
    if q:
        query = query.filter(models.Colaborador.nome.ilike(f"%{q}%"))
    if departamento_id is not None:
        query = query.filter(models.Colaborador.departamento_id == departamento_id)
    if ativo is not None:
        query = query.filter(models.Colaborador.ativo == ativo)

    query = query.order_by(models.Colaborador.nome)
    offset = (page - 1) * page_size
    colaboradores = query.offset(offset).limit(page_size).all()

    result = []
    for c in colaboradores:
        resp = schemas.ColaboradorResponse.model_validate(c)
        resp.departamento_nome = c.departamento.nome if c.departamento else None
        result.append(resp)
    return result


@router.post("", response_model=schemas.ColaboradorResponse, status_code=status.HTTP_201_CREATED)
def criar_colaborador(
    dados: schemas.ColaboradorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    existente = db.query(models.Colaborador).filter(
        models.Colaborador.matricula == dados.matricula
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Matricula '{dados.matricula}' ja esta em uso.",
        )

    dados_dict = dados.model_dump()
    # Classifica nivel automaticamente pelo salario
    if dados_dict.get("salario_base"):
        nivel_auto = _classificar_nivel(db, dados_dict["salario_base"])
        if nivel_auto:
            dados_dict["nivel"] = nivel_auto
    colaborador = models.Colaborador(**dados_dict)
    db.add(colaborador)
    db.flush()

    # Registra evento de admissao automaticamente
    _registrar_evento(
        db, colaborador, "admissao", dados.data_admissao,
        dados_anteriores={},
        dados_novos={
            "cargo": dados.cargo,
            "nivel": dados.nivel,
            "tipo_contrato": dados.tipo_contrato,
            "departamento": colaborador.departamento.nome if colaborador.departamento else None,
        },
        observacao="Admissao registrada no sistema.",
        criado_por=current_user.id,
    )

    db.commit()
    db.refresh(colaborador)
    resp = schemas.ColaboradorResponse.model_validate(colaborador)
    resp.departamento_nome = colaborador.departamento.nome if colaborador.departamento else None
    return resp


@router.get("/{colaborador_id}", response_model=schemas.ColaboradorResponse)
def obter_colaborador(
    colaborador_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")
    resp = schemas.ColaboradorResponse.model_validate(colaborador)
    resp.departamento_nome = colaborador.departamento.nome if colaborador.departamento else None
    return resp


@router.put("/{colaborador_id}", response_model=schemas.ColaboradorResponse)
def atualizar_colaborador(
    colaborador_id: int,
    dados: schemas.ColaboradorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")

    # Captura estado anterior para o historico
    dep_anterior = colaborador.departamento.nome if colaborador.departamento else None
    anteriores = {
        "cargo": colaborador.cargo,
        "nivel": colaborador.nivel,
        "tipo_contrato": colaborador.tipo_contrato,
        "departamento": dep_anterior,
    }

    novos_dados = dados.model_dump(exclude_unset=True)
    for campo, valor in novos_dados.items():
        setattr(colaborador, campo, valor)

    # Reclassifica nivel se salario mudou
    if "salario_base" in novos_dados and colaborador.salario_base:
        nivel_auto = _classificar_nivel(db, colaborador.salario_base)
        if nivel_auto:
            colaborador.nivel = nivel_auto

    db.flush()

    # Determina tipo de evento e registra se houve mudanca relevante
    dep_novo = colaborador.departamento.nome if colaborador.departamento else None
    novos = {
        "cargo": colaborador.cargo,
        "nivel": colaborador.nivel,
        "tipo_contrato": colaborador.tipo_contrato,
        "departamento": dep_novo,
    }

    mudou_cargo = anteriores["cargo"] != novos["cargo"] or anteriores["nivel"] != novos["nivel"]
    mudou_depto = anteriores["departamento"] != novos["departamento"]
    mudou_contrato = anteriores["tipo_contrato"] != novos["tipo_contrato"]

    if mudou_cargo:
        tipo = "promocao" if novos["nivel"] and anteriores["nivel"] and novos["nivel"] > anteriores["nivel"] else "mudanca_cargo"
        _registrar_evento(db, colaborador, tipo, date.today(), anteriores, novos,
                          observacao=None, criado_por=current_user.id)
    elif mudou_depto:
        _registrar_evento(db, colaborador, "mudanca_depto", date.today(), anteriores, novos,
                          observacao=None, criado_por=current_user.id)
    elif mudou_contrato:
        _registrar_evento(db, colaborador, "mudanca_contrato", date.today(), anteriores, novos,
                          observacao=None, criado_por=current_user.id)

    db.commit()
    db.refresh(colaborador)
    resp = schemas.ColaboradorResponse.model_validate(colaborador)
    resp.departamento_nome = colaborador.departamento.nome if colaborador.departamento else None
    return resp


@router.patch("/{colaborador_id}/inativar", response_model=schemas.ColaboradorResponse)
def inativar_colaborador(
    colaborador_id: int,
    data_inativacao: Optional[date] = Query(None, description="Data de inativacao (padrao: hoje)"),
    observacao: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")

    data_efetiva = data_inativacao or date.today()
    dep_nome = colaborador.departamento.nome if colaborador.departamento else None

    colaborador.ativo = False
    colaborador.data_inativacao = data_efetiva

    _registrar_evento(
        db, colaborador, "inativacao", data_efetiva,
        dados_anteriores={"cargo": colaborador.cargo, "nivel": colaborador.nivel,
                          "tipo_contrato": colaborador.tipo_contrato, "departamento": dep_nome},
        dados_novos={},
        observacao=observacao or "Colaborador inativado.",
        criado_por=current_user.id,
    )

    db.commit()
    db.refresh(colaborador)
    resp = schemas.ColaboradorResponse.model_validate(colaborador)
    resp.departamento_nome = dep_nome
    return resp


@router.get("/{colaborador_id}/historico", response_model=List[schemas.HistoricoColaboradorResponse])
def listar_historico(
    colaborador_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Retorna o historico completo de eventos do colaborador, do mais recente ao mais antigo."""
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")

    historico = (
        db.query(models.HistoricoColaborador)
        .filter(models.HistoricoColaborador.colaborador_id == colaborador_id)
        .order_by(models.HistoricoColaborador.data_evento.desc())
        .all()
    )
    return historico


@router.post("/{colaborador_id}/historico", response_model=schemas.HistoricoColaboradorResponse,
             status_code=status.HTTP_201_CREATED)
def adicionar_evento_historico(
    colaborador_id: int,
    dados: schemas.HistoricoColaboradorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Adiciona um evento manual ao historico (ex: ajuste salarial, observacao)."""
    colaborador = db.query(models.Colaborador).filter(
        models.Colaborador.id == colaborador_id
    ).first()
    if not colaborador:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Colaborador nao encontrado.")

    evento = models.HistoricoColaborador(
        colaborador_id=colaborador_id,
        criado_por=current_user.id,
        **dados.model_dump(),
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento
