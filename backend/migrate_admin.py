from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
        conn.commit()
        print("Coluna is_admin adicionada")
    except Exception as e:
        conn.rollback()
        print("Coluna ja existe:", str(e)[:80])

    conn.execute(text("UPDATE usuarios SET is_admin = TRUE WHERE email = 'admin@clouddog.com'"))
    conn.commit()
    result = conn.execute(text("SELECT id, email, is_admin FROM usuarios"))
    for row in result:
        print(row)
