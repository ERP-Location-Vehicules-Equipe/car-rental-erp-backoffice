from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.maintenance import MaintenanceStatus, VehicleMaintenance
from schemas.maintenance_schema import MaintenanceCreate, MaintenanceUpdate
from services.vehicle_service import get_vehicle_or_404


def get_maintenance_by_id(db: Session, maintenance_id: int):
    return (
        db.query(VehicleMaintenance)
        .filter(VehicleMaintenance.id == maintenance_id)
        .first()
    )


def get_maintenance_or_404(db: Session, maintenance_id: int) -> VehicleMaintenance:
    maintenance = get_maintenance_by_id(db, maintenance_id)
    if not maintenance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance not found",
        )
    return maintenance


def get_vehicle_maintenances(db: Session, vehicle_id: int):
    get_vehicle_or_404(db, vehicle_id)
    return (
        db.query(VehicleMaintenance)
        .filter(VehicleMaintenance.vehicle_id == vehicle_id)
        .order_by(VehicleMaintenance.date_debut.desc())
        .all()
    )


def apply_vehicle_status_from_maintenance(vehicle, maintenance_status: MaintenanceStatus):
    if maintenance_status in {
        MaintenanceStatus.PLANIFIEE,
        MaintenanceStatus.EN_COURS,
    }:
        vehicle.statut = "maintenance"
    elif maintenance_status in {
        MaintenanceStatus.TERMINEE,
        MaintenanceStatus.ANNULEE,
    }:
        vehicle.statut = "disponible"


def validate_maintenance_dates(
    date_debut,
    date_fin,
):
    if date_debut is not None and date_fin is not None and date_fin < date_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_fin cannot be before date_debut",
        )


def create_maintenance(
    db: Session, vehicle_id: int, maintenance_data: MaintenanceCreate
):
    vehicle = get_vehicle_or_404(db, vehicle_id)

    maintenance = VehicleMaintenance(
        vehicle_id=vehicle_id,
        **maintenance_data.model_dump(),
    )
    apply_vehicle_status_from_maintenance(vehicle, maintenance_data.statut)

    db.add(maintenance)
    db.commit()
    db.refresh(maintenance)
    return maintenance


def update_maintenance(
    db: Session, maintenance_id: int, maintenance_data: MaintenanceUpdate
):
    maintenance = get_maintenance_or_404(db, maintenance_id)
    vehicle = get_vehicle_or_404(db, maintenance.vehicle_id)
    update_data = maintenance_data.model_dump(exclude_unset=True)

    date_debut = update_data.get("date_debut", maintenance.date_debut)
    date_fin = update_data.get("date_fin", maintenance.date_fin)
    validate_maintenance_dates(date_debut, date_fin)

    for field, value in update_data.items():
        setattr(maintenance, field, value)

    if "statut" in update_data:
        apply_vehicle_status_from_maintenance(vehicle, maintenance.statut)

    db.commit()
    db.refresh(maintenance)
    return maintenance


def delete_maintenance(db: Session, maintenance_id: int):
    maintenance = get_maintenance_or_404(db, maintenance_id)
    vehicle = get_vehicle_or_404(db, maintenance.vehicle_id)

    db.delete(maintenance)
    db.commit()

    remaining_open_maintenance = (
        db.query(VehicleMaintenance)
        .filter(
            VehicleMaintenance.vehicle_id == vehicle.id,
            VehicleMaintenance.statut.in_(
                [
                    MaintenanceStatus.PLANIFIEE.value,
                    MaintenanceStatus.EN_COURS.value,
                ]
            ),
        )
        .first()
    )

    if not remaining_open_maintenance and vehicle.statut == "maintenance":
        vehicle.statut = "disponible"
        db.commit()
