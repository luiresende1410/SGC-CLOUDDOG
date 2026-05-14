from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/certificacoes", tags=["Certificacoes"])

def _require_admin(current_user: models.Usuario):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Apenas administradores podem executar esta acao.")

@router.get("", response_model=List[schemas.CertificacaoResponse])
def listar_certificacoes(
    colaborador_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    q = db.query(models.Certificacao)
    if colaborador_id:
        q = q.filter(models.Certificacao.colaborador_id == colaborador_id)
    return q.order_by(models.Certificacao.ano.desc(), models.Certificacao.mes.desc()).all()

@router.post("", response_model=schemas.CertificacaoResponse, status_code=status.HTTP_201_CREATED)
def criar_certificacao(
    dados: schemas.CertificacaoCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    colab = db.query(models.Colaborador).filter(models.Colaborador.id == dados.colaborador_id).first()
    if not colab:
        raise HTTPException(status_code=404, detail="Colaborador nao encontrado.")
    cert = models.Certificacao(**dados.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert

@router.put("/{cert_id}", response_model=schemas.CertificacaoResponse)
def atualizar_certificacao(
    cert_id: int,
    dados: schemas.CertificacaoUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    cert = db.query(models.Certificacao).filter(models.Certificacao.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificacao nao encontrada.")
    for k, v in dados.model_dump(exclude_none=True).items():
        setattr(cert, k, v)
    db.commit()
    db.refresh(cert)
    return cert

@router.delete("/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
def excluir_certificacao(
    cert_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    _require_admin(current_user)
    cert = db.query(models.Certificacao).filter(models.Certificacao.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificacao nao encontrada.")
    db.delete(cert)
    db.commit()

@router.get("/relatorio/por-tipo")
def relatorio_por_tipo(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    certs = db.query(models.Certificacao).all()
    por_tipo = {}
    for c in certs:
        por_tipo[c.tipo] = por_tipo.get(c.tipo, 0) + 1
    return [{"tipo": k, "total": v} for k, v in sorted(por_tipo.items(), key=lambda x: -x[1])]

@router.get("/relatorio/por-departamento")
def relatorio_por_departamento(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    certs = (
        db.query(models.Certificacao, models.Colaborador, models.Departamento)
        .join(models.Colaborador, models.Certificacao.colaborador_id == models.Colaborador.id)
        .join(models.Departamento, models.Colaborador.departamento_id == models.Departamento.id)
        .all()
    )
    por_depto = {}
    for cert, colab, depto in certs:
        if depto.nome not in por_depto:
            por_depto[depto.nome] = {"departamento": depto.nome, "total": 0, "por_tipo": {}}
        por_depto[depto.nome]["total"] += 1
        por_depto[depto.nome]["por_tipo"][cert.tipo] = por_depto[depto.nome]["por_tipo"].get(cert.tipo, 0) + 1
    return list(por_depto.values())
