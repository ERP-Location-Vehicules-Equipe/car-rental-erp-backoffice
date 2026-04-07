from sqlalchemy.orm import Session
from app.Model.location import Location
from app.Schemas.location_schema import LocationCreate
from fastapi import HTTPException
from datetime import datetime


# =============================
# ✅ CREATE LOCATION
# =============================
def create_location(db: Session, location: LocationCreate):

    print("🚀 CREATE STARTED")

    date_debut = location.date_debut
    date_fin = location.date_fin_prevue

    # 🔹 تحويل string → datetime
    if isinstance(date_debut, str):
        date_debut = datetime.fromisoformat(date_debut)

    if isinstance(date_fin, str):
        date_fin = datetime.fromisoformat(date_fin)

    # =============================
    # 🔥 CHECK réservation
    # =============================
    existing = db.query(Location).filter(
        Location.vehicle_id == location.vehicle_id,
        Location.date_debut <= date_fin,
        Location.date_fin_prevue >= date_debut
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Vehicle already reserved in this period"
        )

    # =============================
    # 📅 CALCUL DAYS
    # =============================
    days = (date_fin - date_debut).days

    if days <= 0:
        raise HTTPException(
            status_code=400,
            detail="date_fin_prevue must be after date_debut"
        )

    montant_total = location.tarif_jour * days

    # =============================
    # 🧩 CREATE OBJECT
    # =============================
    new_location = Location(
        client_id=location.client_id,
        vehicle_id=location.vehicle_id,
        agence_depart_id=location.agence_depart_id,
        agence_retour_id=location.agence_retour_id,
        date_debut=date_debut,
        date_fin_prevue=date_fin,
        date_retour_reelle=location.date_retour_reelle,
        tarif_jour=location.tarif_jour,
        montant_total=montant_total,
        etat=location.etat or "en_cours",
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    print("✅ COMMIT DONE")

    return new_location


# =============================
# 🔥 RETOUR LOCATION (NEW)
# =============================
def retour_location(db: Session, location_id: int, date_retour: datetime):

    location = db.query(Location).filter(Location.id == location_id).first()

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # 🔹 تحويل string → datetime
    if isinstance(date_retour, str):
        date_retour = datetime.fromisoformat(date_retour)

    # 🔹 سجل تاريخ الرجوع
    location.date_retour_reelle = date_retour

    # =============================
    # ⏱️ CALCUL DELAY
    # =============================
    delay = (date_retour - location.date_fin_prevue).days

    penalty = 0

    if delay > 0:
        penalty = delay * location.tarif_jour

    # =============================
    # 💰 UPDATE TOTAL
    # =============================
    location.montant_total += penalty

    # =============================
    # 🔄 UPDATE STATUS
    # =============================
    location.etat = "terminée"

    db.commit()
    db.refresh(location)

    return {
        "message": "Retour processed successfully",
        "delay_days": delay if delay > 0 else 0,
        "penalty": penalty,
        "new_total": location.montant_total
    }