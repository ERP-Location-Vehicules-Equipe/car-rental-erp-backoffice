from sqlalchemy import Column, Integer, DateTime, Float, String
from datetime import datetime
from app.config.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys (دابا غير integers حتى تربطهم لاحقاً)
    client_id = Column(Integer, nullable=False)
    vehicle_id = Column(Integer, nullable=False)
    agence_depart_id = Column(Integer, nullable=False)
    agence_retour_id = Column(Integer, nullable=False)

    # Dates
    date_debut = Column(DateTime, nullable=False)
    date_fin_prevue = Column(DateTime, nullable=False)
    date_retour_reelle = Column(DateTime, nullable=True)

    # Pricing
    tarif_jour = Column(Float, nullable=False)
    montant_total = Column(Float, nullable=False)

    # Status
    etat = Column(String, nullable=False)

    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)