from pydantic import BaseModel, ConfigDict


class MarqueBase(BaseModel):
    nom: str


class MarqueCreate(MarqueBase):
    pass


class MarqueUpdate(BaseModel):
    nom: str | None = None


class MarqueResponse(MarqueBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
