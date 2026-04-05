from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from Model.FinanceModels import CompteTresorerie
from Schemas.FinanceSchemas import CreateCompteSchema, UpdateCompteSchema


# ==============================
# Create Compte
# ==============================

def create_compte(data: CreateCompteSchema, db: Session):
    compte = CompteTresorerie(
        nom=data.nom,
        type=data.type,
        solde_actuel=data.solde_actuel
    )

    db.add(compte)
    db.commit()
    db.refresh(compte)

    return compte


# ==============================
# Get All Comptes
# ==============================

def get_all_comptes(db: Session, user):
    # ✅ Removed agence_id filter
    return db.query(CompteTresorerie).filter(
        CompteTresorerie.deleted_at == None
    ).all()


# ==============================
# Get Compte by ID
# ==============================

def get_compte_by_id(compte_id: int, db: Session):
    compte = db.query(CompteTresorerie).filter(
        CompteTresorerie.id == compte_id,
        CompteTresorerie.deleted_at == None
    ).first()

    if not compte:
        raise HTTPException(status_code=404, detail="Compte not found")

    return compte


# ==============================
# Update Compte
# ==============================

def update_compte(compte_id: int, data: UpdateCompteSchema, db: Session):
    compte = get_compte_by_id(compte_id, db)

    if data.nom:
        compte.nom = data.nom
    if data.solde_actuel is not None:
        compte.solde_actuel = data.solde_actuel

    db.commit()
    db.refresh(compte)

    return compte


# ==============================
# Soft Delete Compte
# ==============================

def delete_compte(compte_id: int, db: Session):
    compte = get_compte_by_id(compte_id, db)
    compte.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Compte deleted successfully"}