from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime, Float, Integer, String

from db import Base
from models.vehicle import casablanca_now


class AssuranceType(str, Enum):
    RC = "rc"
    TOUS_RISQUES = "tous_risques"
    VOL_INCENDIE = "vol_incendie"
    AUTRE = "autre"


class AssuranceStatus(str, Enum):
    ACTIVE = "active"
    EXPIREE = "expiree"
    ANNULEE = "annulee"


class VehicleAssurance(Base):
    __tablename__ = "vehicle_assurances"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, nullable=False, index=True)
    agence_id = Column(Integer, nullable=True, index=True)

    type_assurance = Column(String, nullable=False, default=AssuranceType.RC.value)
    assureur = Column(String, nullable=False)
    numero_police = Column(String, nullable=False)

    date_debut = Column(DateTime, nullable=False)
    date_fin = Column(DateTime, nullable=False)
    montant = Column(Float, nullable=False, default=0.0)
    statut = Column(String, nullable=False, default=AssuranceStatus.ACTIVE.value)
    notes = Column(String, nullable=True)

    reminder_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=casablanca_now, nullable=False)

