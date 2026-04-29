import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2 import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

# نحدد path ديال .env بشكل صريح
BASE_DIR = Path(__file__).resolve().parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(f"DATABASE_URL not found. Check your .env file at: {ENV_PATH}")


def ensure_database_exists(database_url: str) -> None:
    url = make_url(database_url)
    # During local tests we often use sqlite; database provisioning is only for PostgreSQL.
    if url.get_backend_name() != "postgresql":
        return

    database_name = url.database

    if not database_name:
        return

    admin_url = url.set(database="postgres")
    admin_dsn = admin_url.render_as_string(hide_password=False)
    admin_dsn = admin_dsn.replace("postgresql+psycopg2://", "postgresql://", 1)
    admin_dsn = admin_dsn.replace("postgresql+psycopg://", "postgresql://", 1)

    conn = psycopg2.connect(admin_dsn)
    conn.autocommit = True
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (database_name,),
            )
            if cursor.fetchone() is None:
                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
    finally:
        conn.close()


ensure_database_exists(DATABASE_URL)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
