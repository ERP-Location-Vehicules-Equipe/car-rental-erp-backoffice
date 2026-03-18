from fastapi import HTTPException
from sqlalchemy.orm import Session
from Model.User import User
from datetime import datetime


# ==============================
# Get All Users
# ==============================
def get_all_users(db: Session):

    users = db.query(User).filter(User.deleted_at == None).all()

    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    return users


# ==============================
# Get User By ID
# ==============================
def get_user_by_id(db: Session, user_id: int):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# ==============================
# Update User
# ==============================
def update_user(db: Session, user_id: int, data):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ✅ update fields
    if data.nom is not None:
        user.nom = data.nom

    if data.email is not None:
        # check email uniqueness
        existing_user = db.query(User).filter(
            User.email == data.email,
            User.id != user_id
        ).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")

        user.email = data.email

    if data.role is not None:
        user.role = data.role

    if data.agence_id is not None:
        user.agence_id = data.agence_id

    if hasattr(data, "actif") and data.actif is not None:
        user.actif = data.actif

    db.commit()
    db.refresh(user)

    return user


# ==============================
# Soft Delete User
# ==============================
def delete_user(db: Session, user_id: int):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.deleted_at = datetime.utcnow()

    db.commit()

    return {"message": "User deleted successfully"}


# ==============================
# Disable User
# ==============================
def disable_user(db: Session, user_id: int):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.actif = False

    db.commit()
    db.refresh(user)

    return user


# ==============================
# Enable User
# ==============================
def enable_user(db: Session, user_id: int):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.actif = True

    db.commit()
    db.refresh(user)

    return user


# ==============================
# Restore Soft Deleted User
# ==============================
def restore_user(db: Session, user_id: int):

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at != None
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found or not deleted")

    user.deleted_at = None

    db.commit()
    db.refresh(user)

    return user