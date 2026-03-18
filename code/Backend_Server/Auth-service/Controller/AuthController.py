from fastapi import HTTPException
from sqlite3 import IntegrityError

from sqlalchemy.orm import Session
from Model.User import User
from dependencies.AuthDependencies import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
)




# ==============================
# Register
# ==============================
def register_user(db: Session, user_data):

    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed = hash_password(user_data.password)

    user = User(
        nom=user_data.nom,
        email=user_data.email,
        password=hashed,
        agence_id=user_data.agence_id,
        role="employe",
        actif=True
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    return user


# ==============================
# Login
# ==============================
def login_user(db: Session, data):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        # Keep a generic authentication error to avoid user enumeration.
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    })

    refresh_token = create_refresh_token({
        "user_id": user.id
    })

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }


# ==============================
# Create User by Developer/Admin
# ==============================
def create_user_by_developer(db: Session, user_data):

    try:
        # ✅ check email
        existing_user = db.query(User).filter(User.email == user_data.email).first()

        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")

        # ✅ check fields (optional)
        if not user_data.nom:
            raise HTTPException(status_code=400, detail="Nom is required")

        if not user_data.email:
            raise HTTPException(status_code=400, detail="Email is required")

        if not user_data.password:
            raise HTTPException(status_code=400, detail="Password is required")

        hashed_password = hash_password(user_data.password)

        new_user = User(
            nom=user_data.nom,
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
            agence_id=user_data.agence_id,
            actif=user_data.actif
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


# ==============================
# Reset Password
# ==============================
def reset_password(db: Session, data):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    hashed_password = hash_password(data.new_password)

    user.password = hashed_password

    db.commit()

    return {"message": "Password updated successfully"}


# ==============================
# Create Employee by Admin
# ==============================
def create_employee_by_admin(db: Session, user_data):

    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(user_data.password)

    user = User(
        nom=user_data.nom,
        email=user_data.email,
        password=hashed_password,
        role="employe",
        agence_id=user_data.agence_id,
        actif=True
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    return user
