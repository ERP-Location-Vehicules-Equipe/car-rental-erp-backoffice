from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from models.maintenance import MaintenanceStatus, MaintenanceType


class MaintenanceBase(BaseModel):
    type_maintenance: MaintenanceType
    description: str
    date_debut: datetime
    date_fin: datetime | None = None
    cout: float = 0.0
    prestataire: str | None = None
    statut: MaintenanceStatus

    @field_validator("cout")
    @classmethod
    def validate_cout(cls, value: float) -> float:
        if value < 0:
            raise ValueError("cout must be greater than or equal to 0")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.date_fin is not None and self.date_fin < self.date_debut:
            raise ValueError("date_fin cannot be before date_debut")
        return self


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    type_maintenance: MaintenanceType | None = None
    description: str | None = None
    date_debut: datetime | None = None
    date_fin: datetime | None = None
    cout: float | None = None
    prestataire: str | None = None
    statut: MaintenanceStatus | None = None

    @field_validator("cout")
    @classmethod
    def validate_cout(cls, value: float | None) -> float | None:
        if value is not None and value < 0:
            raise ValueError("cout must be greater than or equal to 0")
        return value


class MaintenanceResponse(MaintenanceBase):
    id: int
    vehicle_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
