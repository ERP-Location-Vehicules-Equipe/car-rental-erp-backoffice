from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from Controller.AuthController import (
    create_user_by_developer,
    login_user,
    register_user,
    reset_password,
)
from Model.User import User
from Schemas.AuthSchema import (
    CreateUserByDeveloperSchema,
    LoginSchema,
    RefreshSchema,
    RegisterSchema,
    ResetPasswordSchema,
)
from dependencies.AuthDependencies import (
    admin_or_super_admin_required,
    refresh_access_token,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# ==============================
# Register User
# ==============================
@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    user = register_user(db, data)
    return {"message": "User created", "user": user.email}


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

    return {"access_token": new_token}


# ==============================
# Create User by Admin/Super Admin
# ==============================
@router.post("/create-user")
def create_user(
    data: CreateUserByDeveloperSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_super_admin_required),
):
    # La logique de permissions détaillée est gérée dans le contrôleur.
    user = create_user_by_developer(db, data, current_user)
    return {
        "message": "User created successfully",
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
    }


# ==============================
# Reset Password
# ==============================
@router.post("/reset-password")
def reset_password_route(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    user = reset_password(db, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Password updated successfully"}
