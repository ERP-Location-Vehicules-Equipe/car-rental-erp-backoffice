from sqlalchemy import Column, Integer, String

from db import Base


class Marque(Base):
    __tablename__ = "marques"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
