from sqlalchemy import text
from config.database import engine


def init_db():
    with engine.connect() as conn:

        conn.execute(text("""
            ALTER TABLE utilisateurs
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
        """))

        conn.commit()

    print("DB synced successfully")