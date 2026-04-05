from sqlalchemy import Column, Integer, BigInteger, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Transfer(Base):
    __tablename__ = "transferts"

    id = Column(BigInteger, primary_key=True, index=True)
    vehicule_id = Column(BigInteger, nullable=False)
    agence_source_id = Column(BigInteger, nullable=False)
    agence_destination_id = Column(BigInteger, nullable=False)

    date_depart = Column(DateTime, nullable=True)
    date_arrivee_prevue = Column(DateTime, nullable=True)
    date_arrivee_reelle = Column(DateTime, nullable=True)

    etat = Column(String, nullable=False, default="PENDING")

    # bonus fields ila bghiti tkhlihom
    reason = Column(String(255), nullable=True)
    notes = Column(String(500), nullable=True)
    created_by = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)