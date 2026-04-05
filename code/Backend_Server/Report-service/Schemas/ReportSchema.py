from pydantic import BaseModel
from datetime import datetime

# schema ديال response
class ReportResponse(BaseModel):
    id: int
    total_locations: int
    total_revenue: float
    average_price: float
    created_at: datetime

    class Config:
        from_attributes = True  # باش يقرا من SQLAlchemy model