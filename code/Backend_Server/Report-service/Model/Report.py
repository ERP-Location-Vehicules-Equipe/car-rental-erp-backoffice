from sqlalchemy import Column, Integer, Float, DateTime
from sqlalchemy.sql import func
from config.database import Base


class Report(Base):
    __tablename__ = "reports"

    # 🔹 Primary Key
    id = Column(Integer, primary_key=True, index=True)

    # 🔹 Business Data
    total_locations = Column(Integer, nullable=False)
    revenue_total = Column(Float, nullable=False)
    prix_moyen = Column(Float, nullable=False)

    # 🔹 Auto Timestamp (BEST PRACTICE 🔥)
    date_creation = Column(DateTime, server_default=func.now())