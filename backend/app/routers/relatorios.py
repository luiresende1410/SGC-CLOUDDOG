import csv
import io
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services.custo_service import agregar_por_colaborador, agregar_por_departamento

router = APIRouter(prefix="/relatorios", tags=["Relatorios"])

@router.get("/colaboradores", response_model=schemas.RelatorioColaboradoresResponse)
def relatorio_colaboradores(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    dados = agregar_por_colaborador(db, mes, ano)
    return schemas.RelatorioColaboradoresResponse(
        periodo={"mes": mes, "ano": ano},
        colaboradores=[schemas.ColaboradorRelatorio(**c) for c in dados],
    )

@router.get("/departamentos", response_model=schemas.RelatorioDepartamentosResponse)
def relatorio_departamentos(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    dados = agregar_por_departamento(db, mes, ano)
    departamentos = []
    for d in dados:
        departamentos.append(schemas.DepartamentoRelatorio(
            id=d["id"], nome=d["nome"], total=d["total"],
            num_colaboradores=d["num_colaboradores"],
            colaboradores=[schemas.ColaboradorRelatorio(**c) for c in d["colaboradores"]],
            budget_mensal=d.get("budget_mensal"),
        ))
    return schemas.RelatorioDepartamentosResponse(periodo={"mes": mes, "ano": ano}, departamentos=departamentos)

@router.get("/colaboradores/csv")
def relatorio_colaboradores_csv(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    dados = agregar_por_colaborador(db, mes, ano)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Nome", "Departamento", "Cargo", "Nivel", "Tipo Contrato", "Total"])
    for c in dados:
        writer.writerow([c["nome"], c["departamento"], c["cargo"], c.get("nivel") or "", c["tipo_contrato"], str(c["total"])])
    output.seek(0)
    filename = f"custos_colaboradores_{mes:02d}_{ano}.csv"
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'})

@router.get("/departamentos/csv")
def relatorio_departamentos_csv(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    dados = agregar_por_departamento(db, mes, ano)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Departamento", "Total", "N Colaboradores"])
    for d in dados:
        writer.writerow([d["nome"], str(d["total"]), d["num_colaboradores"]])
    output.seek(0)
    filename = f"custos_departamentos_{mes:02d}_{ano}.csv"
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'})
