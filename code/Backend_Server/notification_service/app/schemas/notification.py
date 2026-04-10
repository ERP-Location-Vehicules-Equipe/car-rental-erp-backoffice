from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class NotificationEventCreate(BaseModel):
    event_type: str = Field(..., min_length=2, max_length=100)
    title: str = Field(..., min_length=2, max_length=255)
    message: str = Field(..., min_length=2)

    channels: list[str] = Field(default_factory=lambda: ["popup"])
    scope: str = Field(default="agence")
    agence_id: int | None = None

    action_url: str | None = None
    metadata: dict[str, Any] | None = None

    user_email: str | None = None
    email_recipients: list[str] = Field(default_factory=list)

    @field_validator("channels")
    @classmethod
    def validate_channels(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip().lower() for item in value if str(item).strip()]
        if not cleaned:
            raise ValueError("At least one channel is required")
        allowed = {"popup", "email"}
        invalid = [item for item in cleaned if item not in allowed]
        if invalid:
            raise ValueError(f"Invalid channels: {', '.join(invalid)}")
        return list(dict.fromkeys(cleaned))

    @field_validator("scope")
    @classmethod
    def validate_scope(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"agence", "all"}:
            raise ValueError("scope must be 'agence' or 'all'")
        return normalized


class NotificationItemResponse(BaseModel):
    id: int
    event_type: str
    title: str
    message: str
    action_url: str | None
    scope: str
    agence_id: int | None
    channels: list[str]
    metadata: dict[str, Any] | None
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseModel):
    unread_count: int


class MarkReadResponse(BaseModel):
    message: str


class NotificationRequest(BaseModel):
    type: str
    channels: list[str] = Field(default_factory=lambda: ["popup"])

    loan_id: int | None = None
    loan_time: datetime | None = None

    car_id: str | None = None
    source_agency: str | None = None
    destination_agency: str | None = None
    depart_date: str | None = None
    arrival_date: str | None = None

    user_email: str | None = None
    client_name: str | None = None
    user_name: str | None = None
    status: str | None = None
    car_name: str | None = None

    maintenance_due_date: str | None = None

    action_url: str | None = None
    agence_id: int | None = None

    def to_event_payload(self) -> NotificationEventCreate:
        title = "Notification"
        message = "Nouvelle mise a jour."

        if self.type == "created":
            title = "Location creee"
            message = f"{self.client_name or 'Client'} a reserve {self.car_name or 'vehicule'}."
        elif self.type == "updated":
            title = "Location mise a jour"
            message = f"Location de {self.client_name or 'client'} mise a jour."
        elif self.type == "status_updated":
            title = "Statut location mis a jour"
            message = f"Statut passe a {self.status or 'mise a jour'}."
        elif self.type == "transfer":
            title = "Transfert cree"
            message = (
                f"{self.car_name or 'Vehicule'} de {self.source_agency or 'source'} "
                f"vers {self.destination_agency or 'destination'}."
            )
        elif self.type == "maintenance_due":
            title = "Entretien requis"
            message = f"{self.car_name or 'Vehicule'} doit passer en entretien."

        metadata = {
            "loan_id": self.loan_id,
            "loan_time": self.loan_time.isoformat() if self.loan_time else None,
            "car_id": self.car_id,
            "source_agency": self.source_agency,
            "destination_agency": self.destination_agency,
            "depart_date": self.depart_date,
            "arrival_date": self.arrival_date,
            "client_name": self.client_name,
            "user_name": self.user_name,
            "status": self.status,
            "car_name": self.car_name,
            "maintenance_due_date": self.maintenance_due_date,
        }

        return NotificationEventCreate(
            event_type=self.type,
            title=title,
            message=message,
            channels=self.channels,
            scope="agence",
            agence_id=self.agence_id,
            action_url=self.action_url,
            metadata=metadata,
            user_email=self.user_email,
        )