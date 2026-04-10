import os

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.entretien import VehicleEntretien
from models.vehicle import Vehicle
from schemas.entretien_schema import EntretienCreate, EntretienUpdate

FINANCE_SERVICE_URL = os.getenv("FINANCE_SERVICE_URL", "http://finance_service:8003")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def get_entretien_by_id(db: Session, entretien_id: int):
    return (
        db.query(VehicleEntretien)
        .filter(VehicleEntretien.id == entretien_id)
        .first()
    )


def get_entretien_or_404(db: Session, entretien_id: int) -> VehicleEntretien:
    entretien = get_entretien_by_id(db, entretien_id)
    if not entretien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entretien not found",
        )
    return entretien


def get_all_entretiens(db: Session, agence_id: int | None = None):
    query = db.query(VehicleEntretien)
    if agence_id is not None:
        query = query.join(
            Vehicle,
            Vehicle.id == VehicleEntretien.vehicle_id,
        ).filter(Vehicle.agence_id == agence_id)
    return query.order_by(VehicleEntretien.date_debut.desc()).all()


def get_vehicle_entretiens(db: Session, vehicle_id: int, agence_id: int | None = None):
    query = db.query(VehicleEntretien).filter(VehicleEntretien.vehicle_id == vehicle_id)
    if agence_id is not None:
        query = query.join(
            Vehicle,
            Vehicle.id == VehicleEntretien.vehicle_id,
        ).filter(Vehicle.agence_id == agence_id)
    return query.order_by(VehicleEntretien.date_debut.desc()).all()


def get_vehicle_or_404(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    return vehicle


def assert_vehicle_in_agence(db: Session, vehicle_id: int, agence_id: int):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if vehicle.agence_id != agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage entretiens in your own agence",
        )


def validate_entretien_dates(
    date_debut,
    date_fin,
):
    if date_debut is not None and date_fin is not None and date_fin < date_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_fin cannot be before date_debut",
        )


def _response_json_safe(response: httpx.Response):
    try:
        return response.json()
    except ValueError:
        return None


def _create_finance_charge_for_entretien(
    entretien_data: EntretienCreate,
    vehicle: Vehicle,
    finance_token: str,
) -> None:
    description = f"Entretien {entretien_data.type_entretien}: {entretien_data.description}"
    if entretien_data.prestataire:
        description = f"{description} | Prestataire: {entretien_data.prestataire}"

    payload = {
        "type": "entretien",
        "vehicule_id": int(vehicle.id),
        "agence_id": int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        "categorie_charge": str(entretien_data.type_entretien),
        "montant": float(entretien_data.cout),
        "date_charge": entretien_data.date_debut.isoformat(),
        "description": description,
    }

    try:
        response = httpx.post(
            f"{FINANCE_SERVICE_URL.rstrip('/')}/api/charges/",
            headers={"Authorization": f"Bearer {finance_token}"},
            json=payload,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach finance service for entretien charge creation",
        )

    response_json = _response_json_safe(response) or {}

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=response_json.get("detail", "Not allowed to create entretien charge in finance service"),
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Finance service error while creating entretien charge",
        )
    if response.status_code >= 400:
        detail = response_json.get("detail", "Unable to create entretien charge in finance service")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )


def create_entretien(
    db: Session,
    entretien_data: EntretienCreate,
    finance_token: str | None = None,
):
    vehicle = get_vehicle_or_404(db, entretien_data.vehicle_id)
    validate_entretien_dates(entretien_data.date_debut, entretien_data.date_fin)

    entretien = VehicleEntretien(
        **entretien_data.model_dump(),
    )

    db.add(entretien)
    try:
        db.flush()
        if finance_token:
            _create_finance_charge_for_entretien(entretien_data, vehicle, finance_token)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(entretien)
    return entretien


def update_entretien(
    db: Session, entretien_id: int, entretien_data: EntretienUpdate
):
    entretien = get_entretien_or_404(db, entretien_id)
    update_data = entretien_data.model_dump(exclude_unset=True)

    date_debut = update_data.get("date_debut", entretien.date_debut)
    date_fin = update_data.get("date_fin", entretien.date_fin)
    validate_entretien_dates(date_debut, date_fin)

    for field, value in update_data.items():
        setattr(entretien, field, value)

    db.commit()
    db.refresh(entretien)
    return entretien


def delete_entretien(db: Session, entretien_id: int):
    entretien = get_entretien_or_404(db, entretien_id)

    db.delete(entretien)
    db.commit()
