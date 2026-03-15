from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db

from Schemas.AuthSchema import (
    RegisterSchema,
    LoginSchema,
    RefreshSchema,
    CreateUserByDeveloperSchema,
    ResetPasswordSchema
)

from Controller.AuthController import (
    register_user,
    login_user,
    refresh_access_token,
    create_user_by_developer,
    reset_password
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ==============================
# Register User
# ==============================

@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):

    user = register_user(db, data)

    return {
        "message": "User created",
        "user": user.email
    }


# ==============================
# Login
# ==============================

@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):

    tokens = login_user(db, data)

    if not tokens:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return tokens


# ==============================
# Refresh Token
# ==============================

@router.post("/refresh")
def refresh(data: RefreshSchema):

    new_token = refresh_access_token(data.refresh_token)

    if not new_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return {
        "access_token": new_token
    }


# ==============================
# Create User by Developer/Admin
# ==============================

@router.post("/create-user")
def create_user(data: CreateUserByDeveloperSchema, db: Session = Depends(get_db)):

    user = create_user_by_developer(db, data)

    return {
        "message": "User created successfully",
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    }
@router.post("/reset-password")
def reset_password_route(data: ResetPasswordSchema, db: Session = Depends(get_db)):

    user = reset_password(db, data)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "message": "Password updated successfully"
    }