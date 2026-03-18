from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationRequest(BaseModel):
    type: str
    loan_id: int
    client_email: str
    client_name: str
    user_name: str
    loan_time: datetime
    status: Optional[str] = None
    car_name: Optional[str] = None
