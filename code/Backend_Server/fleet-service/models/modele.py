from sqlalchemy import Column, Integer, String

from db import Base


class Modele(Base):
    __tablename__ = "modeles"

    id = Column(Integer, primary_key=True, index=True)
    marque_id = Column(Integer, nullable=True)
    nom = Column(String, nullable=False)
