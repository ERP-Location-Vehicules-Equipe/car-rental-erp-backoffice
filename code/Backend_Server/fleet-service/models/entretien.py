from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, Integer, String

from db import Base
from models.vehicle import casablanca_now


class EntretienType(str, Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"


class EntretienStatus(str, Enum):
    PLANIFIEE = "planifiee"
    EN_COURS = "en_cours"
    TERMINEE = "terminee"
    ANNULEE = "annulee"


class VehicleEntretien(Base):
    __tablename__ = "vehicle_entretiens"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, nullable=False, index=True)
    type_entretien = Column(String, nullable=False)
    description = Column(String, nullable=False)
    date_debut = Column(DateTime, nullable=False)
    date_fin = Column(DateTime, nullable=True)
    cout = Column(Float, nullable=False, default=0.0)
    prestataire = Column(String, nullable=True)
    statut = Column(String, nullable=False)
    created_at = Column(DateTime, default=casablanca_now, nullable=False)
