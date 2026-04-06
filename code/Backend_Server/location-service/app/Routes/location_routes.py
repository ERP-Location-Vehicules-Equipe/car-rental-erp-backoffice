from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from sqlalchemy import func

from app.config.database import get_db
from app.Model.location import Location
from app.Schemas.location_schema import LocationCreate, LocationResponse
from app.Controller.location_controller import create_location

router = APIRouter(prefix="/locations", tags=["Locations"])


# =========================
# CREATE
# =========================
@router.post("/", response_model=LocationResponse)
def create(location: LocationCreate, db: Session = Depends(get_db)):
    return create_location(db, location)


# =========================
# GET ALL
# =========================
@router.get("/", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.id.desc()).all()


# =========================
# STATS
# =========================
@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Location).count()

    en_cours = db.query(Location).filter(Location.etat == "en_cours").count()
    terminees = db.query(Location).filter(Location.etat == "terminée").count()
    annulees = db.query(Location).filter(Location.etat == "annulée").count()

    revenue = db.query(func.sum(Location.montant_total)).scalar() or 0

    return {
        "total": total,
        "en_cours": en_cours,
        "terminees": terminees,
        "annulees": annulees,
        "revenue": float(revenue)
    }


# =========================
# GET ONE
# =========================
@router.get("/{id}", response_model=LocationResponse)
def get_location(id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    return location


# =========================
# UPDATE
# =========================
@router.put("/{id}", response_model=LocationResponse)
def update_location(id: int, data: LocationCreate, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    for key, value in data.dict().items():
        setattr(location, key, value)

    db.commit()
    db.refresh(location)

    return location


# =========================
# DELETE
# =========================
@router.delete("/{id}")
def delete_location(id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    db.delete(location)
    db.commit()

    return {"message": "Location deleted successfully"}


# =========================
# UPDATE STATUS (🔥 FIXED)
# =========================
@router.put("/{id}/status")
def update_status(id: int, status: str = Query(...), db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    allowed_status = ["en_cours", "terminée", "annulée"]

    if status not in allowed_status:
        raise HTTPException(status_code=400, detail="Invalid status")

    # 🔥 RULES
    if status == "annulée":
        location.date_retour_reelle = None

    if status == "terminée":
        if not location.date_retour_reelle:
            raise HTTPException(
                status_code=400,
                detail="Impossible de terminer sans retour"
            )

    location.etat = status

    db.commit()
    db.refresh(location)

    return {"message": "Status updated", "etat": location.etat}


# =========================
# RETOUR (🔥 FIXED)
# =========================
@router.put("/{id}/retour")
def retour_location(id: int, date_retour: str = Query(...), db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    if location.etat == "annulée":
        raise HTTPException(status_code=400, detail="Location annulée")

    if location.etat == "terminée":
        raise HTTPException(status_code=400, detail="Already returned")

    try:
        date_retour = datetime.fromisoformat(date_retour)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")

    location.date_retour_reelle = date_retour

    delay_days = (date_retour - location.date_fin_prevue).days

    penalty = 0
    if delay_days > 0:
        penalty = delay_days * location.tarif_jour

    location.montant_total += penalty
    location.etat = "terminée"

    db.commit()
    db.refresh(location)

    return {
        "message": "Retour effectué",
        "delay_days": delay_days,
        "penalty": penalty,
        "total": location.montant_total
    }


# =========================
# PROLONGATION (🔥 FIXED)
# =========================
@router.put("/{id}/prolonger")
def prolonger_location(id: int, new_date_fin: str = Query(...), db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    if location.etat != "en_cours":
        raise HTTPException(status_code=400, detail="Only active locations can be extended")

    try:
        new_date = datetime.fromisoformat(new_date_fin)
    except:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if new_date <= location.date_fin_prevue:
        raise HTTPException(status_code=400, detail="New date must be after current")

    location.date_fin_prevue = new_date

    db.commit()
    db.refresh(location)

    return {
        "message": "Location prolongée",
        "new_date_fin": location.date_fin_prevue
    }