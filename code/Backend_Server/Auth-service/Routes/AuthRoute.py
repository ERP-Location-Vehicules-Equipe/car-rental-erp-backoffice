from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db

from Schemas.AuthSchema import RegisterSchema, LoginSchema, RefreshSchema

from Controller.AuthController import (
    register_user,
    login_user,
    refresh_access_token
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):

    user = register_user(db, data)

    return {
        "message": "User created",
        "user": user.email
    }


@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):

    tokens = login_user(db, data)

    if not tokens:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return tokens


@router.post("/refresh")
def refresh(data: RefreshSchema):

    new_token = refresh_access_token(data.refresh_token)

    if not new_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return {
        "access_token": new_token
    }