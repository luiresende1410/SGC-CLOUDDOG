from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.services.calculo_service import calcular_custo_mensal
from app.services.custo_service import upsert_registro_custo

router = APIRouter(prefix="/custos", tags=["Custos"])


def _get_colaborador_ou_404(db, cid):
    c = db.query(models.Colaborador).filter(models.Colaborador.id == cid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Colaborador nao encontrado.")
    return c


def _calcular(db, dados: schemas.LancamentoCustoInput, colaborador: models.Colaborador):
    return calcular_custo_mensal(
        db=db,
        colaborador=colaborador,
        salario_base_override=dados.salario_base_override,
        bonus_aws_override=dados.bonus_aws_override,
        bonus_prd=dados.bonus_prd,
        comissoes=dados.comissoes,
        hora_extra=dados.hora_extra,
    )


@router.post("/preview", response_model=schemas.LancamentoCustoResponse)
def preview_calculo(
    dados: schemas.LancamentoCustoInput,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Previa do calculo sem salvar."""
    colaborador = _get_colaborador_ou_404(db, dados.colaborador_id)
    salario = dados.salario_base_override or colaborador.salario_base
    if not salario or salario <= 0:
        raise HTTPException(
            status_code=422,
            detail="Salario base nao cadastrado. Edite o colaborador e informe o salario base.",
        )
    componentes = _calcular(db, dados, colaborador)
    total = sum(componentes.values(), Decimal("0"))
    return schemas.LancamentoCustoResponse(
        colaborador_id=dados.colaborador_id, mes=dados.mes, ano=dados.ano,
        componentes=componentes, total=total,
    )


@router.post("/lancar", response_model=schemas.LancamentoCustoResponse)
def lancar_custo(
    dados: schemas.LancamentoCustoInput,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """Lanca custo mensal calculando encargos automaticamente."""
    colaborador = _get_colaborador_ou_404(db, dados.colaborador_id)
    salario = dados.salario_base_override or colaborador.salario_base
    if not salario or salario <= 0:
        raise HTTPException(
            status_code=422,
            detail="Salario base nao cadastrado. Edite o colaborador e informe o salario base.",
        )

    # Se houve reajuste, atualiza o cadastro
    if dados.salario_base_override and dados.salario_base_override != colaborador.salario_base:
        colaborador.salario_base = dados.salario_base_override
        db.flush()
    if dados.bonus_aws_override is not None and dados.bonus_aws_override != colaborador.bonus_aws:
        colaborador.bonus_aws = dados.bonus_aws_override
        db.flush()

    componentes = _calcular(db, dados, colaborador)
    componentes_schema = [
        schemas.ComponenteCustoSchema(tipo=k, valor=v) for k, v in componentes.items()
    ]
    upsert_registro_custo(db, schemas.RegistroCustoCreate(
        colaborador_id=colaborador.id, mes=dados.mes, ano=dados.ano,
        componentes=componentes_schema,
    ))

    total = sum(componentes.values(), Decimal("0"))
    return schemas.LancamentoCustoResponse(
        colaborador_id=colaborador.id, mes=dados.mes, ano=dados.ano,
        componentes=componentes, total=total,
    )


@router.get("/{colaborador_id}/{mes}/{ano}")
def obter_custo(
    colaborador_id: int, mes: int, ano: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    reg = db.query(models.RegistroCusto).filter(
        models.RegistroCusto.colaborador_id == colaborador_id,
        models.RegistroCusto.mes == mes,
        models.RegistroCusto.ano == ano,
    ).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registro nao encontrado.")
    componentes = {c.tipo: c.valor for c in reg.componentes}
    total = sum(componentes.values(), Decimal("0"))
    return {"colaborador_id": colaborador_id, "mes": mes, "ano": ano,
            "componentes": componentes, "total": total}

@router.post("/replicar", response_model=schemas.LancamentoCustoResponse)
def replicar_mes_anterior(
    colaborador_id: int,
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """
    Replica o registro de custo do mes anterior para o mes/ano informado.
    Usa os dados do cadastro atual do colaborador (salario, beneficios) e
    os componentes variaveis (bonus_prd, comissoes, hora_extra) do mes anterior.
    Recalcula os encargos com os parametros atuais.
    """
    from app.services.calculo_service import calcular_custo_mensal

    colaborador = _get_colaborador_ou_404(db, colaborador_id)

    # Calcula mes/ano anterior
    mes_ant = mes - 1 if mes > 1 else 12
    ano_ant = ano if mes > 1 else ano - 1

    reg_ant = db.query(models.RegistroCusto).filter(
        models.RegistroCusto.colaborador_id == colaborador_id,
        models.RegistroCusto.mes == mes_ant,
        models.RegistroCusto.ano == ano_ant,
    ).first()

    if not reg_ant:
        raise HTTPException(
            status_code=404,
            detail=f"Nenhum registro encontrado para {mes_ant:02d}/{ano_ant}. Nao ha dados para replicar.",
        )

    # Extrai variaveis do mes anterior
    comps_ant = {c.tipo: float(c.valor) for c in reg_ant.componentes}
    bonus_prd  = Decimal(str(comps_ant.get("bonus_prd", 0)))
    comissoes  = Decimal(str(comps_ant.get("comissoes", 0)))
    hora_extra = Decimal(str(comps_ant.get("hora_extra", 0)))

    # Recalcula com dados atuais do colaborador + variaveis do mes anterior
    componentes = calcular_custo_mensal(
        db=db,
        colaborador=colaborador,
        bonus_prd=bonus_prd,
        comissoes=comissoes,
        hora_extra=hora_extra,
    )

    componentes_schema = [
        schemas.ComponenteCustoSchema(tipo=k, valor=v) for k, v in componentes.items()
    ]
    upsert_registro_custo(db, schemas.RegistroCustoCreate(
        colaborador_id=colaborador.id, mes=mes, ano=ano,
        componentes=componentes_schema,
    ))

    total = sum(componentes.values(), Decimal("0"))
    return schemas.LancamentoCustoResponse(
        colaborador_id=colaborador.id, mes=mes, ano=ano,
        componentes=componentes, total=total,
    )


@router.post("/replicar-todos")
def replicar_todos_mes_anterior(
    mes: int,
    ano: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_user),
):
    """
    Replica o mes anterior para TODOS os colaboradores ativos que tiveram custo
    no mes anterior. Gera os registros do mes/ano informado.
    Retorna um resumo com quantos foram replicados e quais falharam.
    """
    from app.services.calculo_service import calcular_custo_mensal

    mes_ant = mes - 1 if mes > 1 else 12
    ano_ant = ano if mes > 1 else ano - 1

    registros_anteriores = (
        db.query(models.RegistroCusto)
        .join(models.Colaborador)
        .filter(
            models.RegistroCusto.mes == mes_ant,
            models.RegistroCusto.ano == ano_ant,
            models.Colaborador.ativo == True,
        )
        .all()
    )

    if not registros_anteriores:
        raise HTTPException(
            status_code=404,
            detail=f"Nenhum registro encontrado para {mes_ant:02d}/{ano_ant}.",
        )

    replicados = []
    erros = []

    for reg_ant in registros_anteriores:
        try:
            colaborador = reg_ant.colaborador
            comps_ant = {c.tipo: float(c.valor) for c in reg_ant.componentes}
            bonus_prd  = Decimal(str(comps_ant.get("bonus_prd", 0)))
            comissoes  = Decimal(str(comps_ant.get("comissoes", 0)))
            hora_extra = Decimal(str(comps_ant.get("hora_extra", 0)))

            componentes = calcular_custo_mensal(
                db=db,
                colaborador=colaborador,
                bonus_prd=bonus_prd,
                comissoes=comissoes,
                hora_extra=hora_extra,
            )
            componentes_schema = [
                schemas.ComponenteCustoSchema(tipo=k, valor=v) for k, v in componentes.items()
            ]
            upsert_registro_custo(db, schemas.RegistroCustoCreate(
                colaborador_id=colaborador.id, mes=mes, ano=ano,
                componentes=componentes_schema,
            ))
            total = sum(componentes.values(), Decimal("0"))
            replicados.append({"nome": colaborador.nome, "total": float(total)})
        except Exception as e:
            erros.append({"nome": reg_ant.colaborador.nome, "erro": str(e)})

    return {
        "mes_origem": f"{mes_ant:02d}/{ano_ant}",
        "mes_destino": f"{mes:02d}/{ano}",
        "replicados": len(replicados),
        "erros": len(erros),
        "detalhes": replicados,
        "falhas": erros,
    }
