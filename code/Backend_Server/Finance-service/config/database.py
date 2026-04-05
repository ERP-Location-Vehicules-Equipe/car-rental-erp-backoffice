# import dial les outils nécessaires mn SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# import bash nqraw variables mn .env
import os
from dotenv import load_dotenv

# chargement dial fichier .env
load_dotenv()

# récupération dial DATABASE_URL mn .env
DATABASE_URL = os.getenv("DATABASE_URL")

# création dial engine (connexion m3a base de données)
engine = create_engine(DATABASE_URL)

# création dial Session (bach n'interagit m3a DB)
SessionLocal = sessionmaker(
    autocommit=False,   # khasna ndiro commit manuellement
    autoflush=False,    # ma kaydirch flush automatiquement
    bind=engine         # liaison m3a engine
)

# base principale bach ncrééw models (tables)
Base = declarative_base()


# function kat3tina session w katsedha mn b3d
def get_db():
    db = SessionLocal()   # création dial session jdida
    try:
        yield db          # kat3ti session bach nst3mloha
    finally:
        db.close()        # fermeture dial connexion