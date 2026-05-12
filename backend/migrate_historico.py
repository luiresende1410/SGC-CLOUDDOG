from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # 1. data_inativacao no colaborador
    try:
        conn.execute(text("ALTER TABLE colaboradores ADD COLUMN data_inativacao DATE"))
        conn.commit()
        print("data_inativacao adicionada")
    except Exception as e:
        conn.rollback()
        print("data_inativacao ja existe:", str(e)[:60])

    # 2. snapshot no registro de custo
    for col in ["cargo_snapshot", "nivel_snapshot", "tipo_contrato_snapshot"]:
        try:
            conn.execute(text(f"ALTER TABLE registros_custo ADD COLUMN {col} VARCHAR(100)"))
            conn.commit()
            print(f"{col} adicionada")
        except Exception as e:
            conn.rollback()
            print(f"{col} ja existe:", str(e)[:60])

    # 3. tabela de historico de colaboradores
    try:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS historico_colaboradores (
                id SERIAL PRIMARY KEY,
                colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
                tipo_evento VARCHAR(50) NOT NULL,
                data_evento DATE NOT NULL,
                cargo_anterior VARCHAR(100),
                cargo_novo VARCHAR(100),
                nivel_anterior VARCHAR(10),
                nivel_novo VARCHAR(10),
                salario_anterior NUMERIC(15,2),
                salario_novo NUMERIC(15,2),
                tipo_contrato_anterior VARCHAR(10),
                tipo_contrato_novo VARCHAR(10),
                departamento_anterior VARCHAR(100),
                departamento_novo VARCHAR(100),
                observacao TEXT,
                criado_em TIMESTAMPTZ DEFAULT NOW(),
                criado_por INTEGER REFERENCES usuarios(id)
            )
        """))
        conn.commit()
        print("historico_colaboradores criada")
    except Exception as e:
        conn.rollback()
        print("historico_colaboradores ja existe:", str(e)[:60])

    # 4. Popular snapshots nos registros existentes com dados atuais do colaborador
    conn.execute(text("""
        UPDATE registros_custo rc
        SET cargo_snapshot = c.cargo,
            nivel_snapshot = c.nivel,
            tipo_contrato_snapshot = c.tipo_contrato
        FROM colaboradores c
        WHERE rc.colaborador_id = c.id
          AND rc.cargo_snapshot IS NULL
    """))
    conn.commit()
    r = conn.execute(text("SELECT COUNT(*) FROM registros_custo WHERE cargo_snapshot IS NOT NULL"))
    print("Registros com snapshot:", r.scalar())

    # 5. Popular historico com evento de admissao para todos os colaboradores
    conn.execute(text("""
        INSERT INTO historico_colaboradores
            (colaborador_id, tipo_evento, data_evento, cargo_novo, nivel_novo,
             tipo_contrato_novo, observacao)
        SELECT id, 'admissao', data_admissao, cargo, nivel, tipo_contrato,
               'Registro inicial importado'
        FROM colaboradores
        WHERE id NOT IN (
            SELECT DISTINCT colaborador_id FROM historico_colaboradores
            WHERE tipo_evento = 'admissao'
        )
    """))
    conn.commit()
    r = conn.execute(text("SELECT COUNT(*) FROM historico_colaboradores"))
    print("Eventos no historico:", r.scalar())

print("Migracao concluida!")
