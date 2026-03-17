from pydantic import BaseModel, EmailStr
from typing import Optional, List


class CreateEmployeeSchema(BaseModel):

    nom: str
    email: EmailStr
    password: str
    agence_id: int


class UpdateUserSchema(BaseModel):

    nom: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    agence_id: Optional[int] = None
    actif: Optional[bool] = None


class ChangePasswordSchema(BaseModel):

    old_password: str
    new_password: str


class UpdateUserRoleSchema(BaseModel):

    role: str


class UpdateUserStatusSchema(BaseModel):

    actif: bool


class UserResponseSchema(BaseModel):

    id: int
    nom: str
    email: EmailStr
    role: str
    agence_id: int
    actif: bool

    class Config:
        from_attributes = True


class UserListResponseSchema(BaseModel):

    users: List[UserResponseSchema]