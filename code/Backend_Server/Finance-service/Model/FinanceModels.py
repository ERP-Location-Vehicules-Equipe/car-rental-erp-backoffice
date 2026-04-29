from datetime import datetime

from config.database import Base
from sqlalchemy import BigInteger, Column, DateTime, Integer, Numeric, String


def _bigint_pk():
    """Postgres: BIGINT ; SQLite: INTEGER AUTOINCREMENT (BigInteger seul ne l'active pas)."""
    return BigInteger().with_variant(Integer(), "sqlite")


class Facture(Base):
    __tablename__ = "factures"

    id = Column(_bigint_pk(), primary_key=True, autoincrement=True, index=True)
    location_id = Column(BigInteger, nullable=False)  # location-service id
    numero = Column(String, unique=True, nullable=False)
    montant_ht = Column(Numeric(10, 2), nullable=False)
    tva = Column(Numeric(5, 2), nullable=False, default=20.0)
    montant_ttc = Column(Numeric(10, 2), nullable=False)
    date_emission = Column(DateTime, default=datetime.utcnow)
    statut = Column(String, default="en_attente")  # en_attente | validee | annulee
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class Paiement(Base):
    __tablename__ = "paiements"

    id = Column(_bigint_pk(), primary_key=True, autoincrement=True, index=True)
    facture_id = Column(BigInteger, nullable=False)
    location_id = Column(BigInteger, nullable=True)
    compte_id = Column(BigInteger, nullable=True)
    montant = Column(Numeric(10, 2), nullable=False)
    mode = Column(String, nullable=False)  # especes | virement | carte | cheque
    date_paiement = Column(DateTime, default=datetime.utcnow)
    reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class CompteTresorerie(Base):
    __tablename__ = "comptes_tresorerie"

    id = Column(_bigint_pk(), primary_key=True, autoincrement=True, index=True)
    nom = Column(String, nullable=False)
    type = Column(String, nullable=False)  # banque | caisse
    agence_id = Column(BigInteger, nullable=True)
    solde_actuel = Column(Numeric(12, 2), nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class Charge(Base):
    __tablename__ = "charges"

    id = Column(_bigint_pk(), primary_key=True, autoincrement=True, index=True)
    type = Column(String, nullable=False)  # carburant | entretien | assurance | autre
    vehicule_id = Column(BigInteger, nullable=True)
    agence_id = Column(BigInteger, nullable=True)
    compte_id = Column(BigInteger, nullable=True)
    source_type = Column(String, nullable=True)
    source_ref_id = Column(BigInteger, nullable=True)
    categorie_charge = Column(String, nullable=True)
    montant = Column(Numeric(10, 2), nullable=False)
    date_charge = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
