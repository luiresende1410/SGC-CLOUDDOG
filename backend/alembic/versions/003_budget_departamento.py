"""Cria tabela budget_departamento para controle mensal de budget por departamento."""

from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'budget_departamento',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('departamento_id', sa.Integer(), sa.ForeignKey('departamentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mes', sa.SmallInteger(), nullable=False),
        sa.Column('ano', sa.SmallInteger(), nullable=False),
        sa.Column('valor', sa.Numeric(15, 2), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('departamento_id', 'mes', 'ano', name='uq_budget_dept_mes_ano'),
        sa.CheckConstraint('valor >= 0', name='ck_budget_valor_positivo'),
        sa.CheckConstraint('mes >= 1 AND mes <= 12', name='ck_budget_mes_valido'),
    )


def downgrade():
    op.drop_table('budget_departamento')
