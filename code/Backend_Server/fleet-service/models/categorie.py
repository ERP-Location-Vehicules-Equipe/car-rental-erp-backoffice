from sqlalchemy import Column, Float, Integer, String

from db import Base


class Categorie(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    libelle = Column(String, nullable=False)
    tarif_jour_base = Column(Float, nullable=False)
