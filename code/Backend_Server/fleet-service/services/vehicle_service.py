from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.entretien import VehicleEntretien
from models.vehicle import Vehicle
from schemas.vehicle_schema import VehicleCreate, VehicleStatusUpdate, VehicleUpdate


def get_next_available_vehicle_id(db: Session) -> int:
    # Reuse the first missing positive id instead of always generating a new one.
    used_ids = db.query(Vehicle.id).order_by(Vehicle.id.asc()).all()
    next_id = 1

    for (vehicle_id,) in used_ids:
        if vehicle_id != next_id:
            break
        next_id += 1

    return next_id


def get_all_vehicles(db: Session):
    # Return all stored vehicles.
    return db.query(Vehicle).all()


def get_vehicle_by_id(db: Session, vehicle_id: int):
    # Return one vehicle by id or None.
    return db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()


def get_vehicle_or_404(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = get_vehicle_by_id(db, vehicle_id)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    return vehicle


def create_vehicle(db: Session, vehicle_data: VehicleCreate):
    # Create a new vehicle record from the request payload.
    vehicle = Vehicle(
        id=get_next_available_vehicle_id(db),
        **vehicle_data.model_dump(),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle(db: Session, vehicle_id: int, vehicle_data: VehicleUpdate):
    # Update only the fields provided in the request payload.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    update_data = vehicle_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle


def update_vehicle_status(
    db: Session, vehicle_id: int, status_data: VehicleStatusUpdate
):
    # Update only the vehicle status.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    vehicle.statut = status_data.statut
    db.commit()
    db.refresh(vehicle)
    return vehicle


def delete_vehicle(db: Session, vehicle_id: int):
    # Delete a vehicle and its dependent entretiens by id.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    (
        db.query(VehicleEntretien)
        .filter(VehicleEntretien.vehicle_id == vehicle_id)
        .delete(synchronize_session=False)
    )
    db.delete(vehicle)
    db.commit()
