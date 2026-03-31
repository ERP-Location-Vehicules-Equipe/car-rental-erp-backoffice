from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationRequest(BaseModel):
    type: str
    channels: Optional[list[str]] = Field(default_factory=lambda: ["email"])

    # Loan fields
    loan_id: Optional[int] = None
    loan_time: Optional[datetime] = None

    # Transfer fields
    car_id: Optional[str] = None
    source_agency: Optional[str] = None
    destination_agency: Optional[str] = None
    depart_date: Optional[str] = None
    arrival_date: Optional[str] = None

    # Common
    user_email: Optional[str] = None
    client_name: Optional[str] = None
    user_name: Optional[str] = None
    status: Optional[str] = None
    car_name: Optional[str] = None
