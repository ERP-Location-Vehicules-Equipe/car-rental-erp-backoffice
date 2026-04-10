from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from dependencies.auth import (
    AuthContext,
    admin_or_super_admin_required,
    get_current_user,
)
from schemas.vehicle_schema import (
    VehicleCreate,
    VehicleResponse,
    VehicleStatusUpdate,
    VehicleUpdate,
)
from services.vehicle_service import (
    assert_vehicle_in_agence,
    create_vehicle,
    get_available_vehicles_for_transfer,
    delete_vehicle,
    get_all_vehicles,
    get_vehicle_or_404,
    update_vehicle,
    update_vehicle_status,
)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get("/", response_model=list[VehicleResponse])
def list_vehicles(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    if current_user.is_super_admin:
        return get_all_vehicles(db)
    return get_all_vehicles(db, agence_id=current_user.agence_id)


@router.get("/available-transfer", response_model=list[VehicleResponse])
def list_available_vehicles_for_transfer(
    source_agence_id: int | None = None,
    exclude_agence_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    _ = current_user
    return get_available_vehicles_for_transfer(
        db,
        source_agence_id=source_agence_id,
        exclude_agence_id=exclude_agence_id,
    )


@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if not current_user.is_super_admin:
        assert_vehicle_in_agence(vehicle, current_user.agence_id)
    return vehicle


@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_endpoint(
    vehicle_data: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    if current_user.is_admin and vehicle_data.agence_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin can only create vehicles in their own agence",
        )
    return create_vehicle(db, vehicle_data)


@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle_endpoint(
    vehicle_id: int,
    vehicle_data: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if current_user.is_admin:
        assert_vehicle_in_agence(vehicle, current_user.agence_id)
    return update_vehicle(db, vehicle_id, vehicle_data)


@router.patch("/{vehicle_id}/status", response_model=VehicleResponse)
def update_vehicle_status_endpoint(
    vehicle_id: int,
    status_data: VehicleStatusUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if current_user.is_admin:
        assert_vehicle_in_agence(vehicle, current_user.agence_id)
    return update_vehicle_status(db, vehicle_id, status_data)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_endpoint(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if current_user.is_admin:
        assert_vehicle_in_agence(vehicle, current_user.agence_id)
    delete_vehicle(db, vehicle_id)
