from sqlalchemy.orm import Session
from Model.User import User
from dependencies.AuthDependencies import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
)





# ==============================
# Register Normal User
# ==============================

def register_user(db: Session, user_data):

    hashed = hash_password(user_data.password)

    user = User(
        nom=user_data.nom,
        email=user_data.email,
        password=hashed,
        agence_id=user_data.agence_id,
        role="employe",
        actif=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# ==============================
# Login
# ==============================

def login_user(db: Session, data):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        return None

    if not verify_password(data.password, user.password):
        return None

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

# ==============================
# Reset Password 
# ==============================


def reset_password(db: Session, data):

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        return None

    hashed_password = hash_password(data.new_password)

    user.password = hashed_password

    db.commit()

    return user

# ==============================
# Create Employee by Admin 
# ==============================
def create_employee_by_admin(db: Session, user_data):

    hashed_password = hash_password(user_data.password)

    user = User(
        nom=user_data.nom,
        email=user_data.email,
        password=hashed_password,
        role="employe",
        agence_id=user_data.agence_id,
        actif=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user
