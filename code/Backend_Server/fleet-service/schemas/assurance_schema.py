from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from models.assurance import AssuranceStatus, AssuranceType


class AssuranceBase(BaseModel):
    vehicle_id: int
    type_assurance: AssuranceType = AssuranceType.RC
    assureur: str
    numero_police: str
    date_debut: datetime
    date_fin: datetime
    montant: float
    statut: AssuranceStatus = AssuranceStatus.ACTIVE
    notes: str | None = None

    @field_validator("montant")
    @classmethod
    def validate_montant(cls, value: float) -> float:
        if value < 0:
            raise ValueError("montant must be greater than or equal to 0")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_fin <= self.date_debut:
            raise ValueError("date_fin must be after date_debut")
        return self


class AssuranceCreate(AssuranceBase):
    pass


class AssuranceUpdate(BaseModel):
    vehicle_id: int | None = None
    type_assurance: AssuranceType | None = None
    assureur: str | None = None
    numero_police: str | None = None
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    montant: float | None = None
    statut: AssuranceStatus | None = None
    notes: str | None = None

    @field_validator("montant")
    @classmethod
    def validate_montant(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("montant must be greater than or equal to 0")
        return value


class AssuranceResponse(AssuranceBase):
    id: int
    agence_id: int | None = None
    reminder_sent_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

