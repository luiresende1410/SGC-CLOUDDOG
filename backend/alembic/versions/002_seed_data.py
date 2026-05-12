"""Seed data - departments, calculation parameters, and salary table

Revision ID: 002
Revises: 001
Create Date: 2025-01-01 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from decimal import Decimal


# revision identifiers, used by Alembic.
revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Departamentos ---
    departamentos_table = table(
        "departamentos",
        column("nome", sa.String),
    )
    op.bulk_insert(
        departamentos_table,
        [
            {"nome": "Desenvolvimento"},
            {"nome": "Comercial"},
            {"nome": "CoE"},
            {"nome": "Marketing"},
            {"nome": "Projetos"},
            {"nome": "Nuvem Gerenciada"},
        ],
    )

    # --- Parametros de Calculo ---
    parametros_table = table(
        "parametros_calculo",
        column("chave", sa.String),
        column("valor", sa.Numeric),
        column("descricao", sa.String),
    )
    op.bulk_insert(
        parametros_table,
        [
            {"chave": "fgts", "valor": Decimal("0.0800"), "descricao": "Percentual FGTS sobre salario (8%)"},
            {"chave": "gps", "valor": Decimal("0.2780"), "descricao": "Percentual GPS/INSS patronal (27,8%)"},
            {"chave": "multa_fgts", "valor": Decimal("0.0320"), "descricao": "Percentual multa rescisoria FGTS (3,2%)"},
            {"chave": "colaboradores_rateio", "valor": Decimal("35.0000"), "descricao": "Numero de colaboradores para rateio de custos fixos"},
            {"chave": "equipamentos", "valor": Decimal("343.2700"), "descricao": "Custo mensal de equipamentos por colaborador (R$)"},
            {"chave": "escritorio", "valor": Decimal("1762.5900"), "descricao": "Custo mensal de escritorio por colaborador (R$)"},
        ],
    )

    # --- Tabela Salarial ---
    tabela_salarial_table = table(
        "tabela_salarial",
        column("cargo", sa.String),
        column("nivel", sa.String),
        column("ano", sa.SmallInteger),
        column("salario", sa.Numeric),
    )

    registros_salariais = []

    # Analista de Suporte Tecnico 2025
    suporte_2025 = [2353.00, 2588.30, 2847.13, 3131.84, 3445.03, 3789.53, 4168.48, 4585.33, 5043.86, 5548.25, 6103.08, 6713.38, 7384.72, 8123.19, 8935.51]
    for i, salario in enumerate(suporte_2025, start=1):
        registros_salariais.append({"cargo": "Analista de Suporte Tecnico", "nivel": f"L{i}", "ano": 2025, "salario": Decimal(str(salario))})

    # Analista de Infraestrutura 2025
    infra_2025 = [2401.00, 2641.10, 2905.21, 3195.73, 3515.30, 3866.83, 4253.52, 4678.87, 5146.76, 5661.43, 6227.58, 6850.33, 7535.37, 8288.90, 9117.79]
    for i, salario in enumerate(infra_2025, start=1):
        registros_salariais.append({"cargo": "Analista de Infraestrutura", "nivel": f"L{i}", "ano": 2025, "salario": Decimal(str(salario))})

    # Analista de Desenvolvimento 2025
    dev_2025 = [2392.00, 2631.20, 2894.32, 3183.75, 3502.13, 3852.34, 4237.57, 4661.33, 5127.46, 5640.21, 6204.23, 6824.66, 7507.12, 8257.83, 9083.62]
    for i, salario in enumerate(dev_2025, start=1):
        registros_salariais.append({"cargo": "Analista de Desenvolvimento", "nivel": f"L{i}", "ano": 2025, "salario": Decimal(str(salario))})

    # Analista de Projetos 2025
    projetos_2025 = [2033.00, 2236.30, 2459.93, 2705.92, 2976.52, 3274.17, 3601.58, 3961.74, 4357.92, 4793.71, 5273.08, 5800.39, 6380.42, 7018.47, 7720.31]
    for i, salario in enumerate(projetos_2025, start=1):
        registros_salariais.append({"cargo": "Analista de Projetos", "nivel": f"L{i}", "ano": 2025, "salario": Decimal(str(salario))})

    # Analista de Suporte Tecnico 2026
    suporte_2026 = [2505.95, 2756.54, 3032.19, 3335.41, 3668.95, 4035.85, 4439.43, 4883.38, 5371.72, 5908.89, 6499.78, 7149.75, 7864.73, 8651.20, 9516.32]
    for i, salario in enumerate(suporte_2026, start=1):
        registros_salariais.append({"cargo": "Analista de Suporte Tecnico", "nivel": f"L{i}", "ano": 2026, "salario": Decimal(str(salario))})

    # Analista de Infraestrutura 2026
    infra_2026 = [2557.07, 2812.77, 3094.05, 3403.45, 3743.80, 4118.18, 4530.00, 4983.00, 5481.30, 6029.43, 6632.37, 7295.60, 8025.17, 8827.68, 9710.45]
    for i, salario in enumerate(infra_2026, start=1):
        registros_salariais.append({"cargo": "Analista de Infraestrutura", "nivel": f"L{i}", "ano": 2026, "salario": Decimal(str(salario))})

    # Analista de Desenvolvimento 2026
    dev_2026 = [2547.48, 2802.23, 3082.45, 3390.70, 3729.77, 4102.74, 4513.02, 4964.32, 5460.75, 6006.82, 6607.51, 7268.26, 7995.08, 8794.59, 9674.05]
    for i, salario in enumerate(dev_2026, start=1):
        registros_salariais.append({"cargo": "Analista de Desenvolvimento", "nivel": f"L{i}", "ano": 2026, "salario": Decimal(str(salario))})

    # Analista de Projetos 2026
    projetos_2026 = [2114.32, 2325.75, 2558.33, 2814.16, 3095.58, 3405.13, 3745.65, 4120.21, 4532.23, 4985.46, 5484.00, 6032.40, 6635.64, 7299.21, 8029.13]
    for i, salario in enumerate(projetos_2026, start=1):
        registros_salariais.append({"cargo": "Analista de Projetos", "nivel": f"L{i}", "ano": 2026, "salario": Decimal(str(salario))})

    op.bulk_insert(tabela_salarial_table, registros_salariais)


def downgrade() -> None:
    # Remove seed data
    op.execute("DELETE FROM tabela_salarial WHERE ano IN (2025, 2026) AND cargo IN ('Analista de Suporte Tecnico', 'Analista de Infraestrutura', 'Analista de Desenvolvimento', 'Analista de Projetos')")
    op.execute("DELETE FROM parametros_calculo WHERE chave IN ('fgts', 'gps', 'multa_fgts', 'colaboradores_rateio', 'equipamentos', 'escritorio')")
    op.execute("DELETE FROM departamentos WHERE nome IN ('Desenvolvimento', 'Comercial', 'CoE', 'Marketing', 'Projetos', 'Nuvem Gerenciada')")
