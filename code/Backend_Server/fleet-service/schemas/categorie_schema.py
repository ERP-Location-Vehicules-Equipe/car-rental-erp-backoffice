from pydantic import BaseModel, ConfigDict


class CategorieBase(BaseModel):
    libelle: str
    tarif_jour_base: float


class CategorieCreate(CategorieBase):
    pass


class CategorieUpdate(BaseModel):
    libelle: str | None = None
    tarif_jour_base: float | None = None


class CategorieResponse(CategorieBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
