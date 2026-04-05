from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ==============================
# Facture Schemas
# ==============================

class CreateFactureSchema(BaseModel):
    location_id: int
    montant_ht: Decimal
    tva: Decimal = Decimal("20.0")


class UpdateFactureSchema(BaseModel):
    statut: Optional[str] = None
    montant_ht: Optional[Decimal] = None
    tva: Optional[Decimal] = None


class FactureResponseSchema(BaseModel):
    id: int
    location_id: int
    numero: str
    montant_ht: Decimal
    tva: Decimal
    montant_ttc: Decimal
    date_emission: datetime
    statut: str

    class Config:
        from_attributes = True


class FactureListResponseSchema(BaseModel):
    factures: List[FactureResponseSchema]


# ==============================
# Paiement Schemas
# ==============================

class CreatePaiementSchema(BaseModel):
    facture_id: int
    compte_id: Optional[int] = None
    montant: Decimal
    mode: str  # espèces | virement | carte | chèque
    reference: Optional[str] = None


class UpdatePaiementSchema(BaseModel):
    mode: Optional[str] = None
    reference: Optional[str] = None


class PaiementResponseSchema(BaseModel):
    id: int
    facture_id: int
    compte_id: Optional[int]
    montant: Decimal
    mode: str
    date_paiement: datetime
    reference: Optional[str]

    class Config:
        from_attributes = True


class PaiementListResponseSchema(BaseModel):
    paiements: List[PaiementResponseSchema]


# ==============================
# Compte Trésorerie Schemas
# ==============================

class CreateCompteSchema(BaseModel):
    nom: str
    type: str  # banque | caisse
    solde_actuel: Decimal = Decimal("0.0")


class UpdateCompteSchema(BaseModel):
    nom: Optional[str] = None
    solde_actuel: Optional[Decimal] = None


class CompteResponseSchema(BaseModel):
    id: int
    nom: str
    type: str
    solde_actuel: Decimal

    class Config:
        from_attributes = True


class CompteListResponseSchema(BaseModel):
    comptes: List[CompteResponseSchema]


# ==============================
# Charge Schemas
# ==============================

class CreateChargeSchema(BaseModel):
    type: str
    vehicule_id: Optional[int] = None
    agence_id: Optional[int] = None
    categorie_charge: Optional[str] = None
    montant: Decimal
    date_charge: Optional[datetime] = None
    description: Optional[str] = None


class UpdateChargeSchema(BaseModel):
    type: Optional[str] = None
    montant: Optional[Decimal] = None
    categorie_charge: Optional[str] = None
    description: Optional[str] = None


class ChargeResponseSchema(BaseModel):
    id: int
    type: str
    vehicule_id: Optional[int]
    agence_id: Optional[int]
    categorie_charge: Optional[str]
    montant: Decimal
    date_charge: datetime
    description: Optional[str]

    class Config:
        from_attributes = True


class ChargeListResponseSchema(BaseModel):
    charges: List[ChargeResponseSchema]


# ==============================
# Dashboard / Rapport Schema
# ==============================

class RapportFinancierSchema(BaseModel):
    total_factures: Decimal
    total_paiements: Decimal
    total_charges: Decimal
    solde_net: Decimal
    factures_en_attente: int
    factures_payees: int
