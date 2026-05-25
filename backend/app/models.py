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
    tipo_contrato = Column(String(10), nullable=False)
    data_admissao = Column(Date, nullable=False)
    salario_base   = Column(Numeric(15, 2), nullable=True)
    bonus_aws      = Column(Numeric(15, 2), nullable=True, default=0)
    refeicao       = Column(Numeric(15, 2), nullable=True, default=0)
    transporte     = Column(Numeric(15, 2), nullable=True, default=0)
    seguro_saude   = Column(Numeric(15, 2), nullable=True, default=0)
    seguro_vida    = Column(Numeric(15, 2), nullable=True, default=0)
    data_inativacao = Column(Date, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    departamento = relationship("Departamento", back_populates="colaboradores")
    registros_custo = relationship("RegistroCusto", back_populates="colaborador")
    historico = relationship("HistoricoColaborador", back_populates="colaborador",
                             order_by="HistoricoColaborador.data_evento")
    certificacoes = relationship("Certificacao", back_populates="colaborador",
                                 cascade="all, delete-orphan")


class HistoricoColaborador(Base):
    __tablename__ = "historico_colaboradores"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
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
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    criado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    colaborador = relationship("Colaborador", back_populates="historico")


class RegistroCusto(Base):
    __tablename__ = "registros_custo"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    mes = Column(SmallInteger, nullable=False)
    ano = Column(SmallInteger, nullable=False)
    cargo_snapshot = Column(String(100), nullable=True)
    nivel_snapshot = Column(String(10), nullable=True)
    tipo_contrato_snapshot = Column(String(10), nullable=True)
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
    tipo_valor = Column(String(20), nullable=False, server_default="numerico")  # percentual | fixo | numerico
    aplica_a = Column(String(10), nullable=False, server_default="todos")  # CLT | PJ | todos
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


class Certificacao(Base):
    __tablename__ = "certificacoes"

    id = Column(Integer, primary_key=True, index=True)
    colaborador_id = Column(Integer, ForeignKey("colaboradores.id"), nullable=False)
    tipo = Column(String(50), nullable=False)
    nivel = Column(String(50), nullable=False)
    nome = Column(String(200), nullable=False)
    data_obtencao = Column(Date, nullable=True)
    data_expiracao = Column(Date, nullable=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())

    colaborador = relationship("Colaborador", back_populates="certificacoes")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), nullable=False, unique=True)
    senha_hash = Column(String(255), nullable=False)
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False, server_default="false")
    criado_em = Column(DateTime(timezone=True), server_default=func.now())


class BudgetDepartamento(Base):
    __tablename__ = "budget_departamento"

    id = Column(Integer, primary_key=True, index=True)
    departamento_id = Column(Integer, ForeignKey("departamentos.id", ondelete="CASCADE"), nullable=False)
    mes = Column(SmallInteger, nullable=False)
    ano = Column(SmallInteger, nullable=False)
    valor = Column(Numeric(15, 2), nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("departamento_id", "mes", "ano", name="uq_budget_dept_mes_ano"),
        CheckConstraint("valor >= 0", name="ck_budget_valor_positivo"),
        CheckConstraint("mes >= 1 AND mes <= 12", name="ck_budget_mes_valido"),
    )

    departamento = relationship("Departamento", backref="budgets")
