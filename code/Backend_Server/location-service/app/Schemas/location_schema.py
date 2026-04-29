from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class LocationStatus(str, Enum):
    EN_COURS = "en_cours"
    TERMINEE = "terminee"
    ANNULEE = "annulee"


class LocationBase(BaseModel):
    client_id: int
    vehicle_id: int
    agence_depart_id: int
    agence_retour_id: int
    date_debut: datetime
    date_fin_prevue: datetime

    @field_validator("client_id", "vehicle_id", "agence_depart_id", "agence_retour_id")
    @classmethod
    def validate_positive_ids(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("must be a positive integer")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_fin_prevue <= self.date_debut:
            raise ValueError("date_fin_prevue must be after date_debut")
        return self


class LocationCreate(LocationBase):
    tarif_jour: float | None = None
    etat: LocationStatus = LocationStatus.EN_COURS

    @field_validator("tarif_jour")
    @classmethod
    def validate_tarif_jour(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("tarif_jour must be greater than or equal to 0")
        return value


class LocationUpdate(BaseModel):
    client_id: int | None = None
    vehicle_id: int | None = None
    agence_depart_id: int | None = None
    agence_retour_id: int | None = None
    date_debut: datetime | None = None
    date_fin_prevue: datetime | None = None
    date_retour_reelle: datetime | None = None
    tarif_jour: float | None = None

    @field_validator("client_id", "vehicle_id", "agence_depart_id", "agence_retour_id")
    @classmethod
    def validate_positive_ids(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("must be a positive integer")
        return value

    @field_validator("tarif_jour")
    @classmethod
    def validate_tarif_jour(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("tarif_jour must be greater than or equal to 0")
        return value


class LocationStatusUpdate(BaseModel):
    etat: LocationStatus


class LocationRetourRequest(BaseModel):
    date_retour_reelle: datetime


class LocationProlongationRequest(BaseModel):
    date_fin_prevue: datetime


class LocationResponse(BaseModel):
    id: int
    client_id: int
    vehicle_id: int
    agence_depart_id: int
    agence_retour_id: int
    date_debut: datetime
    date_fin_prevue: datetime
    date_retour_reelle: datetime | None = None
    tarif_jour: float
    montant_total: float
    etat: LocationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
