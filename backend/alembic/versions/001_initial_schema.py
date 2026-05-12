"""Initial schema - create all tables

Revision ID: 001
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. departamentos
    op.create_table(
        "departamentos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=100), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome"),
    )
    op.create_index(op.f("ix_departamentos_id"), "departamentos", ["id"], unique=False)

    # 2. colaboradores
    op.create_table(
        "colaboradores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("matricula", sa.String(length=50), nullable=False),
        sa.Column("departamento_id", sa.Integer(), nullable=False),
        sa.Column("cargo", sa.String(length=100), nullable=False),
        sa.Column("nivel", sa.String(length=10), nullable=True),
        sa.Column("tipo_contrato", sa.String(length=10), nullable=False),
        sa.Column("data_admissao", sa.Date(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["departamento_id"], ["departamentos.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("matricula"),
    )
    op.create_index(op.f("ix_colaboradores_id"), "colaboradores", ["id"], unique=False)

    # 3. registros_custo
    op.create_table(
        "registros_custo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("colaborador_id", sa.Integer(), nullable=False),
        sa.Column("mes", sa.SmallInteger(), nullable=False),
        sa.Column("ano", sa.SmallInteger(), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["colaborador_id"], ["colaboradores.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("colaborador_id", "mes", "ano", name="uq_registro_custo_colaborador_mes_ano"),
    )
    op.create_index(op.f("ix_registros_custo_id"), "registros_custo", ["id"], unique=False)

    # 4. componentes_custo
    op.create_table(
        "componentes_custo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("registro_custo_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.String(length=50), nullable=False),
        sa.Column("valor", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.CheckConstraint("valor >= 0", name="ck_componente_custo_valor_nao_negativo"),
        sa.ForeignKeyConstraint(["registro_custo_id"], ["registros_custo.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_componentes_custo_id"), "componentes_custo", ["id"], unique=False)

    # 5. parametros_calculo
    op.create_table(
        "parametros_calculo",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("chave", sa.String(length=50), nullable=False),
        sa.Column("valor", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("descricao", sa.String(length=200), nullable=True),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chave"),
    )
    op.create_index(op.f("ix_parametros_calculo_id"), "parametros_calculo", ["id"], unique=False)

    # 6. tabela_salarial
    op.create_table(
        "tabela_salarial",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cargo", sa.String(length=100), nullable=False),
        sa.Column("nivel", sa.String(length=10), nullable=False),
        sa.Column("ano", sa.SmallInteger(), nullable=False),
        sa.Column("salario", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cargo", "nivel", "ano", name="uq_tabela_salarial_cargo_nivel_ano"),
    )
    op.create_index(op.f("ix_tabela_salarial_id"), "tabela_salarial", ["id"], unique=False)

    # 7. usuarios
    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=200), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_usuarios_id"), "usuarios", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_usuarios_id"), table_name="usuarios")
    op.drop_table("usuarios")
    op.drop_index(op.f("ix_tabela_salarial_id"), table_name="tabela_salarial")
    op.drop_table("tabela_salarial")
    op.drop_index(op.f("ix_parametros_calculo_id"), table_name="parametros_calculo")
    op.drop_table("parametros_calculo")
    op.drop_index(op.f("ix_componentes_custo_id"), table_name="componentes_custo")
    op.drop_table("componentes_custo")
    op.drop_index(op.f("ix_registros_custo_id"), table_name="registros_custo")
    op.drop_table("registros_custo")
    op.drop_index(op.f("ix_colaboradores_id"), table_name="colaboradores")
    op.drop_table("colaboradores")
    op.drop_index(op.f("ix_departamentos_id"), table_name="departamentos")
    op.drop_table("departamentos")
