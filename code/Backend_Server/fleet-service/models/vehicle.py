from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from zoneinfo import ZoneInfo
from db import Base


CASABLANCA_TZ = ZoneInfo("Africa/Casablanca")


def casablanca_now() -> datetime:
    # Keep the local Casablanca clock time in the DB column.
    return datetime.now(CASABLANCA_TZ).replace(tzinfo=None)

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)

    agence_id = Column(Integer)
    modele_id = Column(Integer)
    categorie_id = Column(Integer)

    immatriculation = Column(String, unique=True)
    date_mise_en_circulation = Column(DateTime)

    kilometrage = Column(Integer)
    nombre_places = Column(Integer)
    statut = Column(String)
    photo_url = Column(String, nullable=True)

    prix_location = Column(Float)
    valeur_achat = Column(Float)

    created_at = Column(DateTime, default=casablanca_now)
