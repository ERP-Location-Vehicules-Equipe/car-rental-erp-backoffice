from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.entretien import VehicleEntretien
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


def get_all_entretiens(db: Session):
    return db.query(VehicleEntretien).order_by(VehicleEntretien.date_debut.desc()).all()


def get_vehicle_entretiens(db: Session, vehicle_id: int):
    return (
        db.query(VehicleEntretien)
        .filter(VehicleEntretien.vehicle_id == vehicle_id)
        .order_by(VehicleEntretien.date_debut.desc())
        .all()
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
