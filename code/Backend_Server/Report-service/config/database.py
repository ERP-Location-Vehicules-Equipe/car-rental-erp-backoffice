from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
<<<<<<< HEAD:code/Backend_Server/Auth-service/config/database.py
from sqlalchemy.exc import OperationalError
from fastapi import HTTPException
import os
=======
>>>>>>> abdrahmane:code/Backend_Server/Report-service/config/database.py
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True  # ✅ helps with dropped connections
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db

    except OperationalError:
        raise HTTPException(
            status_code=503,
            detail="Database is not available"
        )

    finally:
        db.close()