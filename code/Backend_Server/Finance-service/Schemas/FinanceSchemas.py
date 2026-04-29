from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


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


class CreatePaiementSchema(BaseModel):
    location_id: int
    facture_id: Optional[int] = None
    montant: Decimal
    mode: str  # especes | virement | carte | cheque
    reference: Optional[str] = None


class UpdatePaiementSchema(BaseModel):
    mode: Optional[str] = None
    reference: Optional[str] = None


class PaiementResponseSchema(BaseModel):
    id: int
    facture_id: int
    location_id: Optional[int] = None
    compte_id: Optional[int]
    montant: Decimal
    mode: str
    date_paiement: datetime
    reference: Optional[str]

    class Config:
        from_attributes = True


class PaiementListResponseSchema(BaseModel):
    paiements: List[PaiementResponseSchema]


class CreateCompteSchema(BaseModel):
    nom: str
    type: str  # banque | caisse
    agence_id: Optional[int] = None
    solde_actuel: Decimal = Decimal("0.0")


class UpdateCompteSchema(BaseModel):
    nom: Optional[str] = None
    type: Optional[str] = None
    solde_actuel: Optional[Decimal] = None


class CompteResponseSchema(BaseModel):
    id: int
    nom: str
    type: str
    agence_id: Optional[int] = None
    solde_actuel: Decimal

    class Config:
        from_attributes = True


class CompteListResponseSchema(BaseModel):
    comptes: List[CompteResponseSchema]


class CreateChargeSchema(BaseModel):
    type: str
    vehicule_id: Optional[int] = None
    agence_id: Optional[int] = None
    compte_id: Optional[int] = None
    source_type: Optional[str] = None
    source_ref_id: Optional[int] = None
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
    compte_id: Optional[int]
    source_type: Optional[str]
    source_ref_id: Optional[int]
    categorie_charge: Optional[str]
    montant: Decimal
    date_charge: datetime
    description: Optional[str]

    class Config:
        from_attributes = True


class ChargeListResponseSchema(BaseModel):
    charges: List[ChargeResponseSchema]


class RapportFinancierSchema(BaseModel):
    total_factures: Decimal
    total_paiements: Decimal
    total_charges: Decimal
    solde_net: Decimal
    factures_en_attente: int
    factures_payees: int
