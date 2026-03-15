from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterSchema(BaseModel):
    nom: str
    email: EmailStr
    password: str
    agence_id: int


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class RefreshSchema(BaseModel):
    refresh_token: str


class CreateUserByDeveloperSchema(BaseModel):
    nom: str
    email: EmailStr
    password: str

    role: str  
    agence_id: int

    actif: Optional[bool] = True
    
class ResetPasswordSchema(BaseModel):
    email: EmailStr
    new_password: str