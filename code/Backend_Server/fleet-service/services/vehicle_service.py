from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from dependencies.auth import AuthContext
from models.entretien import VehicleEntretien
from models.vehicle import Vehicle
from schemas.vehicle_schema import (
    VehicleCreate,
    VehicleStatus,
    VehicleStatusUpdate,
    VehicleUpdate,
)
from services.notification_service import emit_fleet_event


def get_next_available_vehicle_id(db: Session) -> int:
    # Reuse the first missing positive id instead of always generating a new one.
    used_ids = db.query(Vehicle.id).order_by(Vehicle.id.asc()).all()
    next_id = 1

    for (vehicle_id,) in used_ids:
        if vehicle_id != next_id:
            break
        next_id += 1

    return next_id


def get_all_vehicles(db: Session, agence_id: int | None = None):
    # Return all vehicles. Optional agence_id can scope the query.
    query = db.query(Vehicle)
    if agence_id is not None:
        query = query.filter(Vehicle.agence_id == agence_id)
    return query.order_by(Vehicle.id.asc()).all()


def get_available_vehicles_for_transfer(
    db: Session,
    source_agence_id: int | None = None,
    exclude_agence_id: int | None = None,
):
    query = db.query(Vehicle).filter(Vehicle.statut == VehicleStatus.DISPONIBLE.value)
    if source_agence_id is not None:
        query = query.filter(Vehicle.agence_id == source_agence_id)
    if exclude_agence_id is not None:
        query = query.filter(Vehicle.agence_id != exclude_agence_id)
    return query.order_by(Vehicle.id.asc()).all()


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


def assert_vehicle_in_agence(vehicle: Vehicle, agence_id: int):
    if vehicle.agence_id != agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage vehicles in your own agence",
        )


def create_vehicle(db: Session, vehicle_data: VehicleCreate, current_user: AuthContext):
    # Create a new vehicle record from the request payload.
    existing_vehicle = (
        db.query(Vehicle)
        .filter(Vehicle.immatriculation == vehicle_data.immatriculation)
        .first()
    )
    if existing_vehicle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle immatriculation already exists",
        )

    vehicle = Vehicle(
        id=get_next_available_vehicle_id(db),
        **vehicle_data.model_dump(),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_vehicle_created",
        title="Vehicule ajoute",
        message=f"Vehicule {vehicle.immatriculation} ajoute dans le parc.",
        agence_id=int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        metadata={
            "vehicle_id": int(vehicle.id),
            "immatriculation": vehicle.immatriculation,
            "agence_id": int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        },
    )
    return vehicle


def update_vehicle(db: Session, vehicle_id: int, vehicle_data: VehicleUpdate, current_user: AuthContext):
    # Update only the fields provided in the request payload.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    update_data = vehicle_data.model_dump(exclude_unset=True)

    if "immatriculation" in update_data:
        duplicate = (
            db.query(Vehicle)
            .filter(
                Vehicle.immatriculation == update_data["immatriculation"],
                Vehicle.id != vehicle_id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle immatriculation already exists",
            )

    for field, value in update_data.items():
        setattr(vehicle, field, value)

    db.commit()
    db.refresh(vehicle)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_vehicle_updated",
        title="Vehicule mis a jour",
        message=f"Vehicule {vehicle.immatriculation} mis a jour.",
        agence_id=int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        metadata={
            "vehicle_id": int(vehicle.id),
            "immatriculation": vehicle.immatriculation,
            "agence_id": int(vehicle.agence_id) if vehicle.agence_id is not None else None,
            "statut": vehicle.statut,
        },
    )
    return vehicle


def update_vehicle_status(
    db: Session, vehicle_id: int, status_data: VehicleStatusUpdate, current_user: AuthContext
):
    # Update only the vehicle status.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    vehicle.statut = status_data.statut
    db.commit()
    db.refresh(vehicle)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_vehicle_status_updated",
        title="Statut vehicule modifie",
        message=f"Statut du vehicule {vehicle.immatriculation} passe a {vehicle.statut}.",
        agence_id=int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        metadata={
            "vehicle_id": int(vehicle.id),
            "immatriculation": vehicle.immatriculation,
            "agence_id": int(vehicle.agence_id) if vehicle.agence_id is not None else None,
            "statut": vehicle.statut,
        },
    )
    return vehicle


def delete_vehicle(db: Session, vehicle_id: int, current_user: AuthContext):
    # Delete a vehicle and its dependent entretiens by id.
    vehicle = get_vehicle_or_404(db, vehicle_id)
    vehicle_id_value = int(vehicle.id)
    vehicle_label = vehicle.immatriculation
    agence_id = int(vehicle.agence_id) if vehicle.agence_id is not None else None
    (
        db.query(VehicleEntretien)
        .filter(VehicleEntretien.vehicle_id == vehicle_id)
        .delete(synchronize_session=False)
    )
    db.delete(vehicle)
    db.commit()
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_vehicle_deleted",
        title="Vehicule supprime",
        message=f"Vehicule {vehicle_label} supprime du parc.",
        agence_id=agence_id,
        metadata={
            "vehicle_id": vehicle_id_value,
            "immatriculation": vehicle_label,
            "agence_id": agence_id,
        },
    )
