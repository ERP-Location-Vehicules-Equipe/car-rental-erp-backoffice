from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import func

from Model.FinanceModels import Paiement, Facture, CompteTresorerie
from Schemas.FinanceSchemas import CreatePaiementSchema


# ==============================
# Create Paiement
# ==============================

def create_paiement(data: CreatePaiementSchema, db: Session):

    # Check facture exists
    facture = db.query(Facture).filter(
        Facture.id == data.facture_id,
        Facture.deleted_at == None
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")

    # Create paiement
    paiement = Paiement(
        facture_id=data.facture_id,
        compte_id=data.compte_id,
        montant=data.montant,
        mode=data.mode,
        reference=data.reference,
        date_paiement=datetime.utcnow()
    )

    db.add(paiement)

    # ==============================
    # CALCUL TOTAL PAYÉ
    # ==============================
    total_paye = db.query(func.sum(Paiement.montant))\
        .filter(
            Paiement.facture_id == facture.id,
            Paiement.deleted_at == None
        ).scalar() or 0

    total_paye += data.montant

    # ==============================
    # UPDATE STATUT FACTURE
    # ==============================
    if total_paye >= facture.montant_ttc:
        facture.statut = "payée"
    else:
        facture.statut = "en_attente"

    # ==============================
    # UPDATE SOLDE COMPTE
    # ==============================
    if data.compte_id:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.id == data.compte_id
        ).first()
        if compte:
            compte.solde_actuel += data.montant

    db.commit()
    db.refresh(paiement)

    return paiement


# ==============================
# Get All Paiements
# ==============================

def get_all_paiements(db: Session, user):
    # ✅ Removed agence_id filter — Facture n'a pas agence_id
    return db.query(Paiement).filter(
        Paiement.deleted_at == None
    ).all()


# ==============================
# Get Paiements by Facture
# ==============================

def get_paiements_by_facture(facture_id: int, db: Session):
    return db.query(Paiement).filter(
        Paiement.facture_id == facture_id,
        Paiement.deleted_at == None
    ).all()


# ==============================
# Get Paiement by ID
# ==============================

def get_paiement_by_id(paiement_id: int, db: Session):
    paiement = db.query(Paiement).filter(
        Paiement.id == paiement_id,
        Paiement.deleted_at == None
    ).first()

    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement not found")

    return paiement


# ==============================
# Soft Delete Paiement
# ==============================

def delete_paiement(paiement_id: int, db: Session):
    paiement = get_paiement_by_id(paiement_id, db)
    paiement.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Paiement deleted successfully"}