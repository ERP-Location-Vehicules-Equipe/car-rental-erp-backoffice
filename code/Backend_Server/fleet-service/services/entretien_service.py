from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.entretien import VehicleEntretien
from models.vehicle import Vehicle
from schemas.entretien_schema import EntretienCreate, EntretienUpdate


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


def create_entretien(
    db: Session, entretien_data: EntretienCreate
):
    get_vehicle_or_404(db, entretien_data.vehicle_id)
    validate_entretien_dates(entretien_data.date_debut, entretien_data.date_fin)

    entretien = VehicleEntretien(
        **entretien_data.model_dump(),
    )

    db.add(entretien)
    db.commit()
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
