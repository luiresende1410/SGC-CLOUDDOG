"""
Schemas Pydantic para validaÃ§Ã£o de entrada e saÃ­da da API.
Utiliza Pydantic v2 com model_config e from_attributes=True para ORM mode.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 1800


# ---------------------------------------------------------------------------
# Departamento
# ---------------------------------------------------------------------------

class DepartamentoBase(BaseModel):
    nome: str
    budget_mensal: Optional[Decimal] = None


class DepartamentoCreate(DepartamentoBase):
    pass


class DepartamentoUpdate(DepartamentoBase):
    pass


class DepartamentoResponse(DepartamentoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Colaborador
# ---------------------------------------------------------------------------

class ColaboradorBase(BaseModel):
    nome: str
    matricula: str
    departamento_id: int
    cargo: str
    nivel: Optional[str] = None
    tipo_contrato: Literal["CLT", "PJ"]
    data_admissao: date
    salario_base:  Optional[Decimal] = None
    bonus_aws:     Optional[Decimal] = None
    refeicao:      Optional[Decimal] = None
    transporte:    Optional[Decimal] = None
    seguro_saude:  Optional[Decimal] = None
    seguro_vida:   Optional[Decimal] = None


class ColaboradorCreate(ColaboradorBase):
    pass


class ColaboradorUpdate(BaseModel):
    nome: Optional[str] = None
    departamento_id: Optional[int] = None
    cargo: Optional[str] = None
    nivel: Optional[str] = None
    tipo_contrato: Optional[Literal["CLT", "PJ"]] = None
    data_admissao: Optional[date] = None
    salario_base:  Optional[Decimal] = None
    bonus_aws:     Optional[Decimal] = None
    refeicao:      Optional[Decimal] = None
    transporte:    Optional[Decimal] = None
    seguro_saude:  Optional[Decimal] = None
    seguro_vida:   Optional[Decimal] = None


class ColaboradorResponse(ColaboradorBase):
    id: int
    ativo: bool
    data_inativacao: Optional[date] = None
    departamento_nome: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)




# ---------------------------------------------------------------------------
# Lancamento de Custo Mensal (calculo automatico)
# ---------------------------------------------------------------------------

class LancamentoCustoInput(BaseModel):
    colaborador_id: int
    mes: int
    ano: int
    # Overrides opcionais (se houve reajuste neste mes especifico)
    salario_base_override: Optional[Decimal] = None
    bonus_aws_override: Optional[Decimal] = None
    # Variaveis mensais
    bonus_prd: Decimal = Decimal('0')
    comissoes: Decimal = Decimal('0')
    hora_extra: Decimal = Decimal('0')

class LancamentoCustoResponse(BaseModel):
    colaborador_id: int
    mes: int
    ano: int
    componentes: Dict[str, Decimal]
    total: Decimal

# ---------------------------------------------------------------------------
# Historico de Colaboradores
# ---------------------------------------------------------------------------

TIPOS_EVENTO = Literal[
    "admissao", "promocao", "ajuste_salarial", "mudanca_cargo",
    "mudanca_depto", "mudanca_contrato", "inativacao", "reativacao", "observacao"
]

class HistoricoColaboradorCreate(BaseModel):
    tipo_evento: str
    data_evento: date
    cargo_anterior: Optional[str] = None
    cargo_novo: Optional[str] = None
    nivel_anterior: Optional[str] = None
    nivel_novo: Optional[str] = None
    salario_anterior: Optional[Decimal] = None
    salario_novo: Optional[Decimal] = None
    tipo_contrato_anterior: Optional[str] = None
    tipo_contrato_novo: Optional[str] = None
    departamento_anterior: Optional[str] = None
    departamento_novo: Optional[str] = None
    observacao: Optional[str] = None

class HistoricoColaboradorResponse(HistoricoColaboradorCreate):
    id: int
    colaborador_id: int
    criado_em: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

# ---------------------------------------------------------------------------
# ComponenteCusto e RegistroCusto
# ---------------------------------------------------------------------------

class ComponenteCustoSchema(BaseModel):
    tipo: str
    valor: Decimal

    @field_validator("valor")
    @classmethod
    def valor_nao_negativo(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("O valor do componente de custo nÃ£o pode ser negativo")
        return v


class RegistroCustoCreate(BaseModel):
    colaborador_id: int
    mes: int  # 1-12
    ano: int
    componentes: List[ComponenteCustoSchema]

    @field_validator("mes")
    @classmethod
    def mes_valido(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("MÃªs deve estar entre 1 e 12")
        return v


class RegistroCustoResponse(BaseModel):
    id: int
    colaborador_id: int
    mes: int
    ano: int
    total: Decimal
    componentes: List[ComponenteCustoSchema]
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def calcular_total(cls, data: object) -> object:
        """Calcula o total como soma dos componentes quando nÃ£o fornecido explicitamente."""
        # Suporte a objetos ORM (com atributo .componentes) e dicts
        if isinstance(data, dict):
            if "total" not in data or data.get("total") is None:
                componentes = data.get("componentes", [])
                total = sum(
                    (c["valor"] if isinstance(c, dict) else c.valor)
                    for c in componentes
                )
                data["total"] = total
        else:
            # Objeto ORM
            if not hasattr(data, "total") or getattr(data, "total", None) is None:
                componentes = getattr(data, "componentes", [])
                total = sum(c.valor for c in componentes)
                # NÃ£o podemos setar atributo diretamente em ORM; retornamos como dict
                return {
                    "id": data.id,
                    "colaborador_id": data.colaborador_id,
                    "mes": data.mes,
                    "ano": data.ano,
                    "total": total,
                    "componentes": [
                        {"tipo": c.tipo, "valor": c.valor} for c in componentes
                    ],
                }
        return data


# ---------------------------------------------------------------------------
# RelatÃ³rios
# ---------------------------------------------------------------------------

class ComponenteDetalhe(BaseModel):
    tipo: str
    valor: Decimal


class ColaboradorRelatorio(BaseModel):
    id: int
    nome: str
    departamento: str
    cargo: str
    nivel: Optional[str]
    tipo_contrato: str
    total: Decimal
    componentes: Dict[str, Decimal]


class RelatorioColaboradoresResponse(BaseModel):
    periodo: Dict[str, int]  # {"mes": X, "ano": Y}
    colaboradores: List[ColaboradorRelatorio]


class DepartamentoRelatorio(BaseModel):
    id: int
    nome: str
    total: Decimal
    num_colaboradores: int
    colaboradores: List[ColaboradorRelatorio]
    budget_mensal: Optional[Decimal] = None


class RelatorioDepartamentosResponse(BaseModel):
    periodo: Dict[str, int]
    departamentos: List[DepartamentoRelatorio]


# ---------------------------------------------------------------------------
# ParametroCalculo
# ---------------------------------------------------------------------------

class ParametroCalculoBase(BaseModel):
    chave: str
    valor: Decimal
    descricao: Optional[str] = None
    tipo_valor: Optional[str] = "numerico"  # percentual | fixo | numerico
    aplica_a: Optional[str] = "todos"  # CLT | PJ | todos


class ParametroCalculoCreate(ParametroCalculoBase):
    pass


class ParametroCalculoUpdate(BaseModel):
    valor: Decimal
    descricao: Optional[str] = None
    tipo_valor: Optional[str] = None
    aplica_a: Optional[str] = None


class ParametroCalculoResponse(ParametroCalculoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# TabelaSalarial
# ---------------------------------------------------------------------------

class TabelaSalarialBase(BaseModel):
    cargo: str
    nivel: str
    ano: int
    salario: Decimal


class TabelaSalarialCreate(TabelaSalarialBase):
    pass


class TabelaSalarialUpdate(BaseModel):
    salario: Decimal


class TabelaSalarialResponse(TabelaSalarialBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Usuario
# ---------------------------------------------------------------------------

class UsuarioBase(BaseModel):
    email: str
    nome: str


class UsuarioCreate(UsuarioBase):
    senha: str


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    is_admin: bool = False
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# ImportaÃ§Ã£o
# ---------------------------------------------------------------------------

class ResultadoImportacao(BaseModel):
    colaboradores_criados: int = 0
    colaboradores_atualizados: int = 0
    registros_custo_criados: int = 0
    registros_custo_atualizados: int = 0
    erros: List[str] = []



class ResetSenhaRequest(BaseModel):
    nova_senha: str


class AlterarPerfilRequest(BaseModel):
    is_admin: bool







# ---------------------------------------------------------------------------
# Certificacoes
# ---------------------------------------------------------------------------

class CertificacaoBase(BaseModel):
    tipo: str
    nome: str
    mes: int
    ano: int

class CertificacaoCreate(CertificacaoBase):
    colaborador_id: int

class CertificacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    nome: Optional[str] = None
    mes: Optional[int] = None
    ano: Optional[int] = None

class CertificacaoResponse(CertificacaoBase):
    id: int
    colaborador_id: int
    model_config = ConfigDict(from_attributes=True)



# ---------------------------------------------------------------------------
# Certificacoes
# ---------------------------------------------------------------------------

class CertificacaoBase(BaseModel):
    tipo: str
    nivel: str
    nome: str
    data_obtencao: Optional[date] = None
    data_expiracao: Optional[date] = None


class CertificacaoCreate(CertificacaoBase):
    colaborador_id: int


class CertificacaoUpdate(BaseModel):
    tipo: Optional[str] = None
    nivel: Optional[str] = None
    nome: Optional[str] = None
    data_obtencao: Optional[date] = None
    data_expiracao: Optional[date] = None


class CertificacaoResponse(CertificacaoBase):
    id: int
    colaborador_id: int
    model_config = ConfigDict(from_attributes=True)


class CertificacaoPorTipo(BaseModel):
    tipo: str
    quantidade: int


class CertificacaoPorDepartamento(BaseModel):
    departamento: str
    tipo: str
    quantidade: int


class RelatorioCertificacoesResponse(BaseModel):
    total: int
    por_tipo: List[CertificacaoPorTipo]
    por_departamento: List[CertificacaoPorDepartamento]

# ---------------------------------------------------------------------------
# Certificacao
# ---------------------------------------------------------------------------

class CertificacaoBase(BaseModel):
    nome: str
    tipo: Optional[str] = None
    nivel: Optional[str] = None
    data_obtencao: Optional[date] = None
    data_expiracao: Optional[date] = None

class CertificacaoCreate(CertificacaoBase):
    colaborador_id: int

class CertificacaoResponse(CertificacaoBase):
    id: int
    colaborador_id: int
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# BudgetDepartamento
# ---------------------------------------------------------------------------

class BudgetDepartamentoBase(BaseModel):
    departamento_id: int
    mes: int
    ano: int
    valor: Decimal


class BudgetDepartamentoCreate(BudgetDepartamentoBase):
    pass


class BudgetDepartamentoUpdate(BaseModel):
    valor: Decimal


class BudgetDepartamentoResponse(BudgetDepartamentoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class BudgetComparacaoItem(BaseModel):
    departamento_id: int
    departamento_nome: str
    budget: Optional[Decimal] = None
    custo_real: Decimal
    diferenca: Optional[Decimal] = None
    percentual_uso: Optional[float] = None
    status: str  # "abaixo", "acima", "sem_budget"
