from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from schemas.maintenance_schema import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceUpdate,
)
from services.maintenance_service import (
    create_maintenance,
    delete_maintenance,
    get_maintenance_or_404,
    get_vehicle_maintenances,
    update_maintenance,
)

router = APIRouter(tags=["Maintenances"])


@router.post(
    "/vehicles/{vehicle_id}/maintenances",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_endpoint(
    vehicle_id: int,
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
):
    return create_maintenance(db, vehicle_id, maintenance_data)


@router.get(
    "/vehicles/{vehicle_id}/maintenances",
    response_model=list[MaintenanceResponse],
)
def list_vehicle_maintenances(vehicle_id: int, db: Session = Depends(get_db)):
    return get_vehicle_maintenances(db, vehicle_id)


@router.get("/maintenances/{maintenance_id}", response_model=MaintenanceResponse)
def get_maintenance(maintenance_id: int, db: Session = Depends(get_db)):
    return get_maintenance_or_404(db, maintenance_id)


@router.put("/maintenances/{maintenance_id}", response_model=MaintenanceResponse)
def update_maintenance_endpoint(
    maintenance_id: int,
    maintenance_data: MaintenanceUpdate,
    db: Session = Depends(get_db),
):
    return update_maintenance(db, maintenance_id, maintenance_data)


@router.delete("/maintenances/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_endpoint(maintenance_id: int, db: Session = Depends(get_db)):
    delete_maintenance(db, maintenance_id)
