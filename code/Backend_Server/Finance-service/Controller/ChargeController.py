from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from Model.FinanceModels import Charge
from Schemas.FinanceSchemas import CreateChargeSchema, UpdateChargeSchema


# ==============================
# Create Charge
# ==============================

def create_charge(data: CreateChargeSchema, db: Session):
    # ✅ Removed user param — agence_id not in charges table
    charge = Charge(
        type=data.type,
        vehicule_id=data.vehicule_id,
        categorie_charge=data.categorie_charge,
        montant=data.montant,
        date_charge=data.date_charge or datetime.utcnow(),
        description=data.description
    )

    db.add(charge)
    db.commit()
    db.refresh(charge)

    return charge


# ==============================
# Get All Charges
# ==============================

def get_all_charges(db: Session, user):
    # ✅ Removed agence_id filter
    return db.query(Charge).filter(
        Charge.deleted_at == None
    ).all()


# ==============================
# Get Charges by Vehicule
# ==============================

def get_charges_by_vehicule(vehicule_id: int, db: Session):
    return db.query(Charge).filter(
        Charge.vehicule_id == vehicule_id,
        Charge.deleted_at == None
    ).all()


# ==============================
# Get Charge by ID
# ==============================

def get_charge_by_id(charge_id: int, db: Session):
    charge = db.query(Charge).filter(
        Charge.id == charge_id,
        Charge.deleted_at == None
    ).first()

    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")

    return charge


# ==============================
# Update Charge
# ==============================

def update_charge(charge_id: int, data: UpdateChargeSchema, db: Session):
    charge = get_charge_by_id(charge_id, db)

    if data.type:
        charge.type = data.type
    if data.montant is not None:
        charge.montant = data.montant
    if data.categorie_charge:
        charge.categorie_charge = data.categorie_charge
    if data.description:
        charge.description = data.description

    db.commit()
    db.refresh(charge)

    return charge


# ==============================
# Soft Delete Charge
# ==============================

def delete_charge(charge_id: int, db: Session):
    charge = get_charge_by_id(charge_id, db)
    charge.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Charge deleted successfully"}