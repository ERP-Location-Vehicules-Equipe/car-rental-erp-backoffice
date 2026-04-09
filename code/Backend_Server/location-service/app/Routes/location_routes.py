from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.Controller.location_controller import (
    assert_location_scope,
    create_location,
    delete_location,
    extend_location,
    get_all_locations,
    get_location_or_404,
    get_stats,
    process_return,
    update_location,
    update_location_status,
)
from app.dependencies.auth import (
    AuthContext,
    admin_or_super_admin_required,
    get_current_user,
)
from app.Schemas.location_schema import (
    LocationCreate,
    LocationProlongationRequest,
    LocationResponse,
    LocationRetourRequest,
    LocationStatusUpdate,
    LocationUpdate,
)

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def create_location_endpoint(
    location_data: LocationCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return create_location(db, location_data, current_user)


@router.get("/", response_model=list[LocationResponse])
def list_locations(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return get_all_locations(db, current_user)


@router.get("/stats")
def get_location_stats(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return get_stats(db, current_user)


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)
    return location


@router.put("/{location_id}", response_model=LocationResponse)
def update_location_endpoint(
    location_id: int,
    location_data: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return update_location(db, location_id, location_data, current_user)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location_endpoint(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    delete_location(db, location_id, current_user)


@router.put("/{location_id}/status")
def update_status_endpoint(
    location_id: int,
    payload: LocationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    updated = update_location_status(db, location_id, payload.etat, current_user)
    return {"message": "Status updated", "etat": updated.etat}


@router.put("/{location_id}/retour")
def process_return_endpoint(
    location_id: int,
    payload: LocationRetourRequest,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    return process_return(db, location_id, payload, current_user)


@router.put("/{location_id}/prolonger")
def extend_location_endpoint(
    location_id: int,
    payload: LocationProlongationRequest,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    return extend_location(db, location_id, payload, current_user)
