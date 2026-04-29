from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.utils.auth import get_current_user
from app.schemas.transfer import (
    CreateTransferRequest,
    TransferAvailabilityResponse,
    UpdateTransferRequest,
    UpdateTransferStatusRequest,
    TransferResponse
)
from app.services.transfer_service import (
    create_transfer,
    delete_transfer,
    get_transfer_candidates,
    get_all_transfers,
    get_transfer_by_id,
    get_transfers_by_vehicle,
    update_transfer_status,
    update_transfer,
    cancel_transfer
)

router = APIRouter(
    prefix="/transferts",
    tags=["Transferts"],
)


@router.post("/", response_model=TransferResponse)
def create_transfer_route(
    request: CreateTransferRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return create_transfer(db, request, current_user)


@router.get("/disponibilites", response_model=TransferAvailabilityResponse)
def get_transfer_candidates_route(
    source_agence_id: int | None = None,
    include_my_agence: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_transfer_candidates(
        db=db,
        current_user=current_user,
        source_agence_id=source_agence_id,
        include_my_agence=include_my_agence,
    )


@router.get("/", response_model=List[TransferResponse])
def get_all_transfers_route(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_all_transfers(db, current_user)


@router.get("/vehicule/{vehicule_id}", response_model=List[TransferResponse])
def get_transfers_by_vehicle_route(
    vehicule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_transfers_by_vehicle(db, vehicule_id, current_user)


@router.get("/{transfer_id}", response_model=TransferResponse)
def get_transfer_by_id_route(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_transfer_by_id(db, transfer_id, current_user)


@router.put("/{transfer_id}", response_model=TransferResponse)
def update_transfer_route(
    transfer_id: int,
    request: UpdateTransferRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return update_transfer(db, transfer_id, request, current_user)


@router.put("/{transfer_id}/status", response_model=TransferResponse)
def update_transfer_status_route(
    transfer_id: int,
    request: UpdateTransferStatusRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return update_transfer_status(db, transfer_id, request, current_user)


@router.put("/{transfer_id}/cancel", response_model=TransferResponse)
def cancel_transfer_route(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return cancel_transfer(db, transfer_id, current_user)


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transfer_route(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    delete_transfer(db, transfer_id, current_user)
