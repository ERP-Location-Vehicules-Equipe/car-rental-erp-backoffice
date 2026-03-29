from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr


class CreateEmployeeSchema(BaseModel):
    nom: str
    email: EmailStr
    password: str
    agence_id: int


class UpdateUserSchema(BaseModel):
    nom: Optional[str] = None
    email: Optional[EmailStr] = None
    # Le rôle est limité aux rôles supportés.
    role: Optional[Literal["employe", "admin", "super_admin"]] = None
    agence_id: Optional[int] = None
    actif: Optional[bool] = None


class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str


class UpdateUserRoleSchema(BaseModel):
    role: Literal["employe", "admin", "super_admin"]


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


class UpdateMyProfileSchema(BaseModel):
    nom: Optional[str] = None
    email: Optional[EmailStr] = None


class UserListResponseSchema(BaseModel):
    users: List[UserResponseSchema]
