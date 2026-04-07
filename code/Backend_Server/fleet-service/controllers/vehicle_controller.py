from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from schemas.vehicle_schema import (
    VehicleCreate,
    VehicleResponse,
    VehicleStatusUpdate,
    VehicleUpdate,
)
from services.vehicle_service import (
    create_vehicle,
    delete_vehicle,
    get_all_vehicles,
    get_vehicle_or_404,
    update_vehicle_status,
    update_vehicle,
)

# هاد router مسؤول على جميع endpoints ديال vehicles.
router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/", response_model=list[VehicleResponse])
def list_vehicles(db: Session = Depends(get_db)):
    # كيرجع لائحة جميع السيارات.
    return get_all_vehicles(db)


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    # كيرجع سيارة واحدة حسب المعرّف ديالها.
    return get_vehicle_or_404(db, vehicle_id)


@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_endpoint(
    vehicle_data: VehicleCreate, db: Session = Depends(get_db)
):
    # كينشئ سيارة جديدة.
    return create_vehicle(db, vehicle_data)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle_endpoint(
    vehicle_id: int, vehicle_data: VehicleUpdate, db: Session = Depends(get_db)
):
    # كيعدل بيانات سيارة موجودة.
    return update_vehicle(db, vehicle_id, vehicle_data)


@router.patch("/{vehicle_id}/status", response_model=VehicleResponse)
def update_vehicle_status_endpoint(
    vehicle_id: int,
    status_data: VehicleStatusUpdate,
    db: Session = Depends(get_db),
):
    # كيبدل غير status ديال السيارة.
    return update_vehicle_status(db, vehicle_id, status_data)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_endpoint(vehicle_id: int, db: Session = Depends(get_db)):
    # كيمسح سيارة حسب id.
    delete_vehicle(db, vehicle_id)
