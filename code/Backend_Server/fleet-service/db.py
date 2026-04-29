from psycopg import connect, sql
from psycopg.errors import DuplicateDatabase
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, declarative_base

from config import DATABASE_URL


def ensure_database_exists(database_url: str) -> None:
    # كنستخرجو معلومات الاتصال باش نعرفو اسم قاعدة البيانات المطلوبة.
    url = make_url(database_url)
    database_name = url.database

    if not database_name:
        return

    # كنبدلو غير اسم database إلى "postgres" باش نقدروا نخلقو database جديدة من خلالها.
    admin_url = url.set(database="postgres")
    admin_conninfo = admin_url.render_as_string(hide_password=False).replace(
        "postgresql+psycopg://", "postgresql://", 1
    )

    try:
        # إلا كانت database موجودة أصلا، ما كنحتاجوش نزيدو نديرو حتى عملية أخرى.
        test_engine = create_engine(database_url)
        with test_engine.connect():
            pass
        test_engine.dispose()
        return
    except OperationalError as exc:
        if "does not exist" not in str(exc).lower():
            raise

    # إلا ما كانتش database موجودة، كننشئوها مباشرة.
    conn = connect(admin_conninfo, autocommit=True)
    try:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
            except DuplicateDatabase:
                pass
    finally:
        conn.close()


ensure_database_exists(DATABASE_URL)

engine_options = {}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


def get_db():
    # هاد dependency كتحل session مع DB لكل request وكتسدها من بعد.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
