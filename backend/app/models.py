from sqlalchemy import (
    Column, Integer, SmallInteger, String, Boolean, Date, Numeric,
    DateTime, ForeignKey, UniqueConstraint, CheckConstraint, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Departamento(Base):
    __tablename__ = "departamentos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False, unique=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    colaboradores = relationship("Colaborador", back_populates="departamento")


class Colaborador(Base):
    __tablename__ = "colaboradores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    matricula = Column(String(50), nullable=False, unique=True)
    departamento_id = Column(Integer, ForeignKey("departamentos.id"), nullable=False)
    cargo = Column(String(100), nullable=False)
    nivel = Column(String(10), nullable=True)
    tipo_contrato = Column(String(10), nullable=False)  # CLT / PJ
    data_admissao = Column(Date, nullable=False)
    salario_base   = Column(Numeric(15, 2), nullable=True)
    bonus_aws      = Column(Numeric(15, 2), nullable=True, default=0)
    refeicao       = Column(Numeric(15, 2), nullable=True, default=0)
    transporte     = Column(Numeric(15, 2), nullable=True, default=0)
    seguro_saude   = Column(Numeric(15, 2), nullable=True, default=0)
    seguro_vida    = Column(Numeric(15, 2), nullable=True, default=0)
    data_inativacao = Column(Date, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    departamento = relationship("Departamento", back_populates="colaboradores")
    registros_custo = relationship("RegistroCusto", back_populates="colaborador")
    historico = relationship("HistoricoColaborador", back_populates="colaborador",
                             order_by="HistoricoColaborador.data_evento")


class HistoricoColaborador(Base):
    """Rastreia eventos de mudanca no cadastro do colaborador ao longo do tempo."""
    __tablename__ = "historico_colaboradores"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    # Tipos: admissao | promocao | ajuste_salarial | mudanca_cargo | mudanca_depto
    #        mudanca_contrato | inativacao | reativacao | observacao
    tipo_evento = Column(String(50), nullable=False)
    data_evento = Column(Date, nullable=False)
    cargo_anterior = Column(String(100), nullable=True)
    cargo_novo = Column(String(100), nullable=True)
    nivel_anterior = Column(String(10), nullable=True)
    nivel_novo = Column(String(10), nullable=True)
    salario_anterior = Column(Numeric(15, 2), nullable=True)
    salario_novo = Column(Numeric(15, 2), nullable=True)
    tipo_contrato_anterior = Column(String(10), nullable=True)
    tipo_contrato_novo = Column(String(10), nullable=True)
    departamento_anterior = Column(String(100), nullable=True)
    departamento_novo = Column(String(100), nullable=True)
    observacao = Column(Text, nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    criado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    colaborador = relationship("Colaborador", back_populates="historico")


class RegistroCusto(Base):
    __tablename__ = "registros_custo"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    mes = Column(SmallInteger, nullable=False)
    ano = Column(SmallInteger, nullable=False)
    # Snapshot do estado do colaborador no momento do registro
    cargo_snapshot = Column(String(100), nullable=True)
    nivel_snapshot = Column(String(10), nullable=True)
    tipo_contrato_snapshot = Column(String(10), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("colaborador_id", "mes", "ano", name="uq_registro_custo_colaborador_mes_ano"),
    )

    colaborador = relationship("Colaborador", back_populates="registros_custo")
    componentes = relationship("ComponenteCusto", back_populates="registro_custo",
                               cascade="all, delete-orphan")


class ComponenteCusto(Base):
    __tablename__ = "componentes_custo"

    id = Column(Integer, primary_key=True, index=True)
    registro_custo_id = Column(Integer, ForeignKey("registros_custo.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    valor = Column(Numeric(15, 2), nullable=False)

    __table_args__ = (
        CheckConstraint("valor >= 0", name="ck_componente_custo_valor_nao_negativo"),
    )

    registro_custo = relationship("RegistroCusto", back_populates="componentes")


class ParametroCalculo(Base):
    __tablename__ = "parametros_calculo"

    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(50), nullable=False, unique=True)
    valor = Column(Numeric(15, 4), nullable=False)
    descricao = Column(String(200), nullable=True)
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TabelaSalarial(Base):
    __tablename__ = "tabela_salarial"

    id = Column(Integer, primary_key=True, index=True)
    cargo = Column(String(100), nullable=False)
    nivel = Column(String(10), nullable=False)
    ano = Column(SmallInteger, nullable=False)
    salario = Column(Numeric(15, 2), nullable=False)

    __table_args__ = (
        UniqueConstraint("cargo", "nivel", "ano", name="uq_tabela_salarial_cargo_nivel_ano"),
    )


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), nullable=False, unique=True)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False, server_default="false")
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    budget_mensal = Column(Numeric(12, 2), nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


