from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.utils.enums import TransferStatus


class CreateTransferRequest(BaseModel):
    vehicule_id: int
    agence_source_id: int
    agence_destination_id: int
    date_depart: Optional[datetime] = None
    date_arrivee_prevue: Optional[datetime] = None
    reason: str = Field(..., min_length=3, max_length=255)
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("vehicule_id", "agence_source_id", "agence_destination_id")
    @classmethod
    def validate_positive_ids(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("must be a positive integer")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.agence_source_id == self.agence_destination_id:
            raise ValueError("agence_source_id and agence_destination_id must be different")

        if self.date_depart and self.date_arrivee_prevue:
            if self.date_arrivee_prevue <= self.date_depart:
                raise ValueError("date_arrivee_prevue must be after date_depart")
        return self


class UpdateTransferRequest(BaseModel):
    vehicule_id: Optional[int] = None
    agence_source_id: Optional[int] = None
    agence_destination_id: Optional[int] = None
    date_depart: Optional[datetime] = None
    date_arrivee_prevue: Optional[datetime] = None
    reason: Optional[str] = Field(None, min_length=3, max_length=255)
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("vehicule_id", "agence_source_id", "agence_destination_id")
    @classmethod
    def validate_destination(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("must be a positive integer")
        return value

    @model_validator(mode="after")
    def validate_scope(self):
        if (
            self.agence_source_id is not None
            and self.agence_destination_id is not None
            and self.agence_source_id == self.agence_destination_id
        ):
            raise ValueError("agence_source_id and agence_destination_id must be different")
        return self


class TransferAvailabilityVehicle(BaseModel):
    id: int
    immatriculation: str
    modele_id: int | None = None
    agence_id: int
    statut: str
    prix_location: float


class TransferAvailabilityResponse(BaseModel):
    total: int
    vehicles: list[TransferAvailabilityVehicle]


class UpdateTransferStatusRequest(BaseModel):
    etat: TransferStatus
    date_depart: Optional[datetime] = None
    date_arrivee_prevue: Optional[datetime] = None
    date_arrivee_reelle: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)

    @model_validator(mode="after")
    def validate_status_dates(self):
        if self.etat == TransferStatus.IN_TRANSIT:
            if self.date_arrivee_reelle is not None:
                raise ValueError("date_arrivee_reelle is not allowed for IN_TRANSIT")
            if self.date_depart and self.date_arrivee_prevue:
                if self.date_arrivee_prevue <= self.date_depart:
                    raise ValueError("date_arrivee_prevue must be after date_depart")
        if self.etat == TransferStatus.COMPLETED:
            if self.date_arrivee_prevue is not None:
                raise ValueError("date_arrivee_prevue is not allowed for COMPLETED")
        return self


class TransferResponse(BaseModel):
    id: int
    vehicule_id: int
    agence_source_id: int
    agence_destination_id: int
    etat: str
    date_depart: Optional[datetime]
    date_arrivee_prevue: Optional[datetime]
    date_arrivee_reelle: Optional[datetime]
    reason: str | None = None
    notes: Optional[str]
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
