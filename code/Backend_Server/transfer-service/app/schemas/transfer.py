from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from app.utils.enums import TransferStatus


class CreateTransferRequest(BaseModel):
    vehicule_id: int
    agence_source_id: int
    agence_destination_id: int
    date_depart: Optional[date] = None
    reason: str = Field(..., min_length=3, max_length=255)
    notes: Optional[str] = Field(None, max_length=500)
    created_by: str = Field(..., min_length=2, max_length=100)


class UpdateTransferStatusRequest(BaseModel):
    etat: TransferStatus
    notes: Optional[str] = Field(None, max_length=500)


class TransferResponse(BaseModel):
    id: int
    vehicule_id: int
    agence_source_id: int
    agence_destination_id: int
    etat: str
    date_depart: Optional[date]
    date_arrivee_prevue: Optional[date]
    date_arrivee_reelle: Optional[date]
    reason: str
    notes: Optional[str]
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
