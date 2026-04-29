from pydantic import BaseModel, ConfigDict


class ModeleBase(BaseModel):
    marque_id: int | None = None
    nom: str


class ModeleCreate(ModeleBase):
    pass


class ModeleUpdate(BaseModel):
    marque_id: int | None = None
    nom: str | None = None


class ModeleResponse(ModeleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
