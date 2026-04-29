from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from db import get_db
from dependencies.auth import (
    AuthContext,
    employee_or_admin_required,
    get_current_user,
    security,
)
from schemas.assurance_schema import (
    AssuranceCreate,
    AssuranceResponse,
    AssuranceUpdate,
)
from services.assurance_service import (
    create_assurance,
    delete_assurance,
    get_all_assurances,
    get_assurance_or_404,
    get_vehicle_assurances,
    trigger_assurance_reminders,
    update_assurance,
)

router = APIRouter(tags=["Assurances"])


@router.post("/assurances/", response_model=AssuranceResponse, status_code=status.HTTP_201_CREATED)
def create_assurance_endpoint(
    assurance_data: AssuranceCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(employee_or_admin_required),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    return create_assurance(
        db=db,
        assurance_data=assurance_data,
        current_user=current_user,
        finance_token=credentials.credentials,
    )


@router.get("/assurances/", response_model=list[AssuranceResponse])
def list_assurances(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    if current_user.is_super_admin:
        trigger_assurance_reminders(db=db, current_user=current_user, agence_id=None)
        return get_all_assurances(db)

    trigger_assurance_reminders(db=db, current_user=current_user, agence_id=current_user.agence_id)
    return get_all_assurances(db, agence_id=current_user.agence_id)


@router.get("/vehicles/{vehicle_id}/assurances", response_model=list[AssuranceResponse])
def list_vehicle_assurances(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    if current_user.is_super_admin:
        return get_vehicle_assurances(db, vehicle_id)
    return get_vehicle_assurances(db, vehicle_id, agence_id=current_user.agence_id)


@router.get("/assurances/{assurance_id}", response_model=AssuranceResponse)
def get_assurance(
    assurance_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    assurance = get_assurance_or_404(db, assurance_id)
    if (
        not current_user.is_super_admin
        and current_user.agence_id is not None
        and assurance.agence_id is not None
        and int(current_user.agence_id) != int(assurance.agence_id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access assurances in your own agence",
        )
    return assurance


@router.put("/assurances/{assurance_id}", response_model=AssuranceResponse)
def update_assurance_endpoint(
    assurance_id: int,
    assurance_data: AssuranceUpdate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(employee_or_admin_required),
):
    return update_assurance(
        db=db,
        assurance_id=assurance_id,
        assurance_data=assurance_data,
        current_user=current_user,
    )


@router.delete("/assurances/{assurance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assurance_endpoint(
    assurance_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(employee_or_admin_required),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    delete_assurance(
        db=db,
        assurance_id=assurance_id,
        current_user=current_user,
        finance_token=credentials.credentials,
    )


@router.post("/assurances/reminders/scan")
def scan_assurance_reminders(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(employee_or_admin_required),
):
    agence_id = None if current_user.is_super_admin else current_user.agence_id
    return trigger_assurance_reminders(db=db, current_user=current_user, agence_id=agence_id)
