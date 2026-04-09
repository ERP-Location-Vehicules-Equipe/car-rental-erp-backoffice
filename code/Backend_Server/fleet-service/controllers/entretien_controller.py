from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from dependencies.auth import (
    AuthContext,
    admin_or_super_admin_required,
    get_current_user,
)
from schemas.entretien_schema import (
    EntretienCreate,
    EntretienResponse,
    EntretienUpdate,
)
from services.entretien_service import (
    assert_vehicle_in_agence,
    create_entretien,
    delete_entretien,
    get_all_entretiens,
    get_entretien_or_404,
    get_vehicle_entretiens,
    update_entretien,
)

router = APIRouter(tags=["Entretiens"])


@router.post("/entretiens/", response_model=EntretienResponse, status_code=status.HTTP_201_CREATED)
def create_entretien_endpoint(
    entretien_data: EntretienCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    if current_user.is_admin:
        assert_vehicle_in_agence(db, entretien_data.vehicle_id, current_user.agence_id)
    return create_entretien(db, entretien_data)


@router.get("/entretiens/", response_model=list[EntretienResponse])
def list_entretiens(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    if current_user.is_super_admin:
        return get_all_entretiens(db)
    return get_all_entretiens(db, agence_id=current_user.agence_id)


@router.get(
    "/vehicles/{vehicle_id}/entretiens",
    response_model=list[EntretienResponse],
)
def list_vehicle_entretiens(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    if current_user.is_super_admin:
        return get_vehicle_entretiens(db, vehicle_id)
    return get_vehicle_entretiens(db, vehicle_id, agence_id=current_user.agence_id)


@router.get("/entretiens/{entretien_id}", response_model=EntretienResponse)
def get_entretien(
    entretien_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    entretien = get_entretien_or_404(db, entretien_id)
    if not current_user.is_super_admin:
        assert_vehicle_in_agence(db, entretien.vehicle_id, current_user.agence_id)
    return entretien


@router.put("/entretiens/{entretien_id}", response_model=EntretienResponse)
def update_entretien_endpoint(
    entretien_id: int,
    entretien_data: EntretienUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    entretien = get_entretien_or_404(db, entretien_id)
    if current_user.is_admin:
        assert_vehicle_in_agence(db, entretien.vehicle_id, current_user.agence_id)
        if (
            entretien_data.vehicle_id is not None
            and entretien_data.vehicle_id != entretien.vehicle_id
        ):
            assert_vehicle_in_agence(db, entretien_data.vehicle_id, current_user.agence_id)
    return update_entretien(db, entretien_id, entretien_data)


@router.delete("/entretiens/{entretien_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entretien_endpoint(
    entretien_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(admin_or_super_admin_required),
):
    entretien = get_entretien_or_404(db, entretien_id)
    if current_user.is_admin:
        assert_vehicle_in_agence(db, entretien.vehicle_id, current_user.agence_id)
    delete_entretien(db, entretien_id)
