from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db

from Controller.UserController import (
    get_all_users,
    get_user_by_id,
    update_my_profile,
    update_user,
    delete_user,
    disable_user,
    enable_user
)

from dependencies.AuthDependencies import (
    admin_required,
    get_current_user
)

from Schemas.UserSchema import (
    UpdateMyProfileSchema,
    UpdateUserSchema,
    UserResponseSchema
)

from Model.User import User


router = APIRouter(
    prefix="/utilisateurs",
    tags=["Utilisateurs"],
)


# ==============================
# Profile User
# ==============================

@router.get("/profile", response_model=UserResponseSchema)
def get_my_profile(
        current_user: User = Depends(get_current_user)
):
    return current_user


# ==============================
# Get All Users
# ==============================

@router.get("/", response_model=list[UserResponseSchema])
def list_users(
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return get_all_users(db)


# ==============================
# Get User By ID
# ==============================

@router.get("/{user_id}", response_model=UserResponseSchema)
def get_user(
        user_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return get_user_by_id(db, user_id)

# ==============================
# Update My Profile
# ==============================

@router.put("/profile", response_model=UserResponseSchema)
def update_my_profile_route(
        data: UpdateMyProfileSchema,
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user)
):
    return update_my_profile(db, current_user, data)
# ==============================
# Update User
# ==============================

@router.put("/{user_id}", response_model=UserResponseSchema)
def update_user_route(
        user_id: int,
        data: UpdateUserSchema,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return update_user(db, user_id, data)


# ==============================
# Delete User (Soft Delete)
# ==============================

@router.delete("/{user_id}")
def delete_user_route(
        user_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return delete_user(db, user_id)


# ==============================
# Disable User
# ==============================

@router.patch("/{user_id}/disable", response_model=UserResponseSchema)
def disable_user_route(
        user_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return disable_user(db, user_id)


# ==============================
# Enable User
# ==============================

@router.patch("/{user_id}/enable", response_model=UserResponseSchema)
def enable_user_route(
        user_id: int,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_required)
):
    return enable_user(db, user_id)