from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import date

from app.models.transfer import Transfer
from app.schemas.transfer import CreateTransferRequest, UpdateTransferStatusRequest
from app.utils.enums import TransferStatus


ACTIVE_TRANSFER_STATUSES = ["PENDING", "IN_TRANSIT"]


def create_transfer(db: Session, request: CreateTransferRequest):
    if request.agence_source_id == request.agence_destination_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination agencies must be different"
        )

    existing_active_transfer = (
        db.query(Transfer)
        .filter(
            Transfer.vehicule_id == request.vehicule_id,
            Transfer.etat.in_(ACTIVE_TRANSFER_STATUSES)
        )
        .first()
    )

    if existing_active_transfer:
        raise HTTPException(
            status_code=400,
            detail="Vehicle already has an active transfer"
        )

    transfer = Transfer(
        vehicule_id=request.vehicule_id,
        agence_source_id=request.agence_source_id,
        agence_destination_id=request.agence_destination_id,
        etat=TransferStatus.PENDING.value,
        date_depart=request.date_depart,
        reason=request.reason,
        notes=request.notes,
        created_by=request.created_by
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    return transfer


def get_all_transfers(db: Session):
    return db.query(Transfer).all()


def get_transfer_by_id(db: Session, transfer_id: int):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()

    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    return transfer


def get_transfers_by_vehicle(db: Session, vehicule_id: int):
    return db.query(Transfer).filter(Transfer.vehicule_id == vehicule_id).all()


def update_transfer_status(db: Session, transfer_id: int, request: UpdateTransferStatusRequest):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()

    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if transfer.etat == TransferStatus.CANCELLED.value:
        raise HTTPException(status_code=400, detail="Cancelled transfer cannot be updated")

    if transfer.etat == TransferStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Completed transfer cannot be updated")

    transfer.etat = request.etat.value

    if request.notes:
        transfer.notes = request.notes

    if request.etat == TransferStatus.IN_TRANSIT:
        transfer.date_arrivee_prevue = date.today()

    if request.etat == TransferStatus.COMPLETED:
        transfer.date_arrivee_reelle = date.today()

    db.commit()
    db.refresh(transfer)

    return transfer


def cancel_transfer(db: Session, transfer_id: int):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()

    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")

    if transfer.etat == TransferStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Completed transfer cannot be cancelled")

    transfer.etat = TransferStatus.CANCELLED.value

    db.commit()
    db.refresh(transfer)

    return transfer
