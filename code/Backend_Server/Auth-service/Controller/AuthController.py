from fastapi import HTTPException
from sqlite3 import IntegrityError
from sqlalchemy.orm import Session

from Model.User import User
from dependencies.AuthDependencies import (
    ROLE_ADMIN,
    ROLE_EMPLOYE,
    ROLE_SUPER_ADMIN,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
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
        role=ROLE_EMPLOYE,
        actif=True,
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
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        {"user_id": user.id, "email": user.email, "role": user.role}
    )
    refresh_token = create_refresh_token({"user_id": user.id})

    return {"access_token": access_token, "refresh_token": refresh_token}


# ==============================
# Create User by Admin/Super Admin
# ==============================
def create_user_by_developer(db: Session, user_data, current_user: User):
    try:
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")

        if not user_data.nom:
            raise HTTPException(status_code=400, detail="Nom is required")
        if not user_data.email:
            raise HTTPException(status_code=400, detail="Email is required")
        if not user_data.password:
            raise HTTPException(status_code=400, detail="Password is required")

        # Règle métier:
        # - super_admin peut créer tous les rôles sur toutes les agences.
        # - admin peut créer uniquement des employés dans sa propre agence.
        # - il ne doit exister qu'un seul super_admin actif dans l'application.
        if user_data.role == ROLE_SUPER_ADMIN:
            existing_super_admin = db.query(User).filter(
                User.role == ROLE_SUPER_ADMIN,
                User.deleted_at == None,
            ).first()
            if existing_super_admin:
                raise HTTPException(
                    status_code=400,
                    detail="Only one super admin is allowed",
                )

        if current_user.role == ROLE_ADMIN:
            if user_data.role != ROLE_EMPLOYE:
                raise HTTPException(
                    status_code=403,
                    detail="Admin can only create employe users",
                )

            if user_data.agence_id != current_user.agence_id:
                raise HTTPException(
                    status_code=403,
                    detail="Admin can only create users in their own agence",
                )
        elif current_user.role != ROLE_SUPER_ADMIN:
            raise HTTPException(
                status_code=403,
                detail="Admin or super admin access required",
            )

        hashed_password = hash_password(user_data.password)

        new_user = User(
            nom=user_data.nom,
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
            agence_id=user_data.agence_id,
            actif=user_data.actif,
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
    except Exception as error:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(error)}")


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
        role=ROLE_EMPLOYE,
        agence_id=user_data.agence_id,
        actif=True,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    return user
