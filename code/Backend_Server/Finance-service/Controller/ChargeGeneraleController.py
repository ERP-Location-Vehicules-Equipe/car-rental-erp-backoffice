from fastapi import HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from decimal import Decimal

from Model.FinanceModels import Charge
from Schemas.FinanceSchemas import CreateChargeSchema, UpdateChargeSchema


def create_charge_generale(data: CreateChargeSchema, db: Session):
    """Créer une charge générale (société)"""
    
    if data.vehicule_id:
        raise HTTPException(status_code=400, detail="Charge générale ne doit pas avoir de véhicule_id")
    
    charge = Charge(
        type="generale",
        vehicule_id=None,
        agence_id=data.agence_id,
        categorie_charge=data.categorie_charge,
        montant=data.montant,
        date_charge=data.date_charge or datetime.utcnow(),
        description=data.description
    )
    
    db.add(charge)
    db.commit()
    db.refresh(charge)
    
    return charge


def get_charges_generales(db: Session, start_date=None, end_date=None):
    """Récupérer toutes les charges générales"""
    
    query = db.query(Charge).filter(
        Charge.type == "generale",
        Charge.deleted_at == None
    )
    
    if start_date:
        query = query.filter(Charge.date_charge >= start_date)
    if end_date:
        query = query.filter(Charge.date_charge <= end_date)
    
    return query.all()