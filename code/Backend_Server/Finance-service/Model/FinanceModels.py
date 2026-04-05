from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, BigInteger
from config.database import Base
from datetime import datetime


class Facture(Base):

    __tablename__ = "factures"

    id = Column(BigInteger, primary_key=True, index=True)

    location_id = Column(BigInteger, nullable=False)  # FK -> locations

    numero = Column(String, unique=True, nullable=False)

    montant_ht = Column(Numeric(10, 2), nullable=False)

    tva = Column(Numeric(5, 2), nullable=False, default=20.0)

    montant_ttc = Column(Numeric(10, 2), nullable=False)

    date_emission = Column(DateTime, default=datetime.utcnow)

    statut = Column(String, default="en_attente")  # en_attente | payée | annulée

    created_at = Column(DateTime, default=datetime.utcnow)

    deleted_at = Column(DateTime, nullable=True)


class Paiement(Base):

    __tablename__ = "paiements"

    id = Column(BigInteger, primary_key=True, index=True)

    facture_id = Column(BigInteger, nullable=False)  # FK -> factures

    compte_id = Column(BigInteger, nullable=True)   # FK -> comptes_tresorerie

    montant = Column(Numeric(10, 2), nullable=False)

    mode = Column(String, nullable=False)  # espèces | virement | carte | chèque

    date_paiement = Column(DateTime, default=datetime.utcnow)

    reference = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    deleted_at = Column(DateTime, nullable=True)


class CompteTresorerie(Base):

    __tablename__ = "comptes_tresorerie"

    id = Column(BigInteger, primary_key=True, index=True)

    nom = Column(String, nullable=False)

    type = Column(String, nullable=False)  # banque | caisse

    solde_actuel = Column(Numeric(12, 2), nullable=False, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow)

    deleted_at = Column(DateTime, nullable=True)


class Charge(Base):

    __tablename__ = "charges"

    id = Column(BigInteger, primary_key=True, index=True)

    type = Column(String, nullable=False)  # carburant | entretien | assurance | autre

    vehicule_id = Column(BigInteger, nullable=True)  # FK -> vehicules

    agence_id = Column(BigInteger, nullable=True)    # FK -> agences

    categorie_charge = Column(String, nullable=True)

    montant = Column(Numeric(10, 2), nullable=False)

    date_charge = Column(DateTime, default=datetime.utcnow)

    description = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    deleted_at = Column(DateTime, nullable=True)
