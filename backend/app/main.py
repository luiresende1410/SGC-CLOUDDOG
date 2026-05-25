from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.routers import auth, colaboradores, custos, relatorios, departamentos, parametros, tabela_salarial, usuarios, importacao, certificacoes, budgets

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="CloudDog - Gestao de Custos de Colaboradores",
    version="1.0.0",
    description="API para gestao e analise de custos mensais de colaboradores",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(colaboradores.router, prefix="/api")
app.include_router(custos.router, prefix="/api")
app.include_router(relatorios.router, prefix="/api")
app.include_router(departamentos.router, prefix="/api")
app.include_router(parametros.router, prefix="/api")
app.include_router(tabela_salarial.router, prefix="/api")
app.include_router(usuarios.router, prefix="/api")
app.include_router(importacao.router, prefix="/api")
app.include_router(certificacoes.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor.", "code": "INTERNAL_ERROR"},
    )
