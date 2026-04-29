from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.config.database import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(Integer, nullable=False)
    vehicle_id = Column(Integer, nullable=False)
    agence_depart_id = Column(Integer, nullable=False)
    agence_retour_id = Column(Integer, nullable=False)

    date_debut = Column(DateTime, nullable=False)
    date_fin_prevue = Column(DateTime, nullable=False)
    date_retour_reelle = Column(DateTime, nullable=True)

    tarif_jour = Column(Float, nullable=False)
    montant_total = Column(Float, nullable=False)
    etat = Column(String, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
