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

@router.get("/relatorio")
def relatorio_certificacoes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Retorna resumo de certificacoes para o dashboard."""
    certs = db.query(models.Certificacao).all()
    total = len(certs)

    # por_tipo: [{tipo, quantidade}] - agrupa por provedor
    tipo_count: dict = {}
    for c in certs:
        nome = c.nome.upper()
        if 'AWS' in nome:
            provedor = 'AWS'
        elif 'GOOGLE' in nome or 'GCP' in nome:
            provedor = 'GCP'
        elif 'AZURE' in nome:
            provedor = 'Azure'
        elif 'HASHICORP' in nome or 'TERRAFORM' in nome:
            provedor = 'HashiCorp'
        elif 'DATADOG' in nome:
            provedor = 'Datadog'
        else:
            provedor = 'Outros'
        tipo_count[provedor] = tipo_count.get(provedor, 0) + 1
    por_tipo = [{"tipo": k, "quantidade": v} for k, v in tipo_count.items()]

    # por_departamento: [{departamento, tipo, quantidade}] - agrupa por provedor
    dep_tipo_count: dict = {}
    for c in certs:
        colab = db.query(models.Colaborador).filter(models.Colaborador.id == c.colaborador_id).first()
        if colab and colab.departamento:
            dep_nome = colab.departamento.nome
            nome = c.nome.upper()
            if 'AWS' in nome:
                provedor = 'AWS'
            elif 'GOOGLE' in nome or 'GCP' in nome:
                provedor = 'GCP'
            elif 'AZURE' in nome:
                provedor = 'Azure'
            elif 'HASHICORP' in nome or 'TERRAFORM' in nome:
                provedor = 'HashiCorp'
            elif 'DATADOG' in nome:
                provedor = 'Datadog'
            else:
                provedor = 'Outros'
            key = (dep_nome, provedor)
            dep_tipo_count[key] = dep_tipo_count.get(key, 0) + 1
    por_departamento = [{"departamento": k[0], "tipo": k[1], "quantidade": v} for k, v in dep_tipo_count.items()]

    return {"total": total, "por_tipo": por_tipo, "por_departamento": por_departamento}

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


@router.get("/relatorio")
def relatorio_certificacoes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Retorna resumo de certificacoes para o dashboard."""
    certs = db.query(models.Certificacao).all()
    total = len(certs)

    # Agrupa por nome da certificacao (tipo)
    por_tipo: dict = {}
    for c in certs:
        por_tipo[c.nome] = por_tipo.get(c.nome, 0) + 1

    # Agrupa por departamento do colaborador
    por_departamento: dict = {}
    for c in certs:
        colab = db.query(models.Colaborador).filter(models.Colaborador.id == c.colaborador_id).first()
        if colab and colab.departamento:
            dep_nome = colab.departamento.nome
            por_departamento[dep_nome] = por_departamento.get(dep_nome, 0) + 1

    return {"total": total, "por_tipo": por_tipo, "por_departamento": por_departamento}
