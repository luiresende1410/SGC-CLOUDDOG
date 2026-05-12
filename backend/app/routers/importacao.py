from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services.importacao_service import importar_planilha

router = APIRouter(prefix="/importacao", tags=["Importacao"])

@router.post("", response_model=schemas.ResultadoImportacao)
async def importar(
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    if not arquivo.filename or not arquivo.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .xlsx sao aceitos.")
    conteudo = await arquivo.read()
    return importar_planilha(db, conteudo)
