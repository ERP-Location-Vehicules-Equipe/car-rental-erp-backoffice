from sqlalchemy import Column, Integer, String, Boolean, DateTime
from config.database import Base
from datetime import datetime


class User(Base):

    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, index=True)

    agence_id = Column(Integer, nullable=True)

    nom = Column(String, nullable=False)

    email = Column(String, unique=True, index=True)

    password = Column(String, nullable=False)

    role = Column(String, default="employe")

    actif = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    deleted_at = Column(DateTime, nullable=True,default=None)