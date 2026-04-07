from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class VehicleStatus(str, Enum):
    DISPONIBLE = "disponible"
    LOUE = "loue"
    ENTRETIEN = "entretien"
    HORS_SERVICE = "hors_service"


class VehicleBase(BaseModel):
    # Shared fields between create and response schemas.
    agence_id: int
    modele_id: int
    categorie_id: int
    immatriculation: str
    date_mise_en_circulation: datetime | None = None
    kilometrage: int
    nombre_places: int
    statut: VehicleStatus
    photo_url: str | None = None
    prix_location: float
    valeur_achat: float


class VehicleCreate(VehicleBase):
    # Schema used to create a new vehicle.
    pass


class VehicleUpdate(BaseModel):
    # Partial update schema for vehicle data.
    agence_id: int | None = None
    modele_id: int | None = None
    categorie_id: int | None = None
    immatriculation: str | None = None
    date_mise_en_circulation: datetime | None = None
    kilometrage: int | None = None
    nombre_places: int | None = None
    statut: VehicleStatus | None = None
    photo_url: str | None = None
    prix_location: float | None = None
    valeur_achat: float | None = None


class VehicleStatusUpdate(BaseModel):
    # Dedicated payload for status-only updates.
    statut: VehicleStatus


class VehicleResponse(VehicleBase):
    # API response schema for a vehicle.
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
