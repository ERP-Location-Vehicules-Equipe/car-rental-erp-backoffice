from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.utils.auth import get_current_user
from app.schemas.transfer import (
    CreateTransferRequest,
    UpdateTransferStatusRequest,
    TransferResponse
)
from app.services.transfer_service import (
    create_transfer,
    get_all_transfers,
    get_transfer_by_id,
    get_transfers_by_vehicle,
    update_transfer_status,
    cancel_transfer
)

router = APIRouter(
    prefix="/transferts",
    tags=["Transferts"],
)


@router.post("/", response_model=TransferResponse)
def create_transfer_route(request: CreateTransferRequest, db: Session = Depends(get_db)):
    return create_transfer(db, request)


@router.get("/", response_model=List[TransferResponse])
def get_all_transfers_route(db: Session = Depends(get_db)):
    return get_all_transfers(db)


@router.get("/vehicule/{vehicule_id}", response_model=List[TransferResponse])
def get_transfers_by_vehicle_route(vehicule_id: int, db: Session = Depends(get_db)):
    return get_transfers_by_vehicle(db, vehicule_id)


@router.get("/{transfer_id}", response_model=TransferResponse)
def get_transfer_by_id_route(transfer_id: int, db: Session = Depends(get_db)):
    return get_transfer_by_id(db, transfer_id)


@router.put("/{transfer_id}/status", response_model=TransferResponse)
def update_transfer_status_route(
    transfer_id: int,
    request: UpdateTransferStatusRequest,
    db: Session = Depends(get_db)
):
    return update_transfer_status(db, transfer_id, request)


@router.put("/{transfer_id}/cancel", response_model=TransferResponse)
def cancel_transfer_route(transfer_id: int, db: Session = Depends(get_db)):
    return cancel_transfer(db, transfer_id)
