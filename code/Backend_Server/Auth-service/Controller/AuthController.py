from sqlalchemy.orm import Session
from Model.User import User

from passlib.context import CryptContext
from jose import jwt, JWTError

from datetime import datetime, timedelta

from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==============================
# Password Functions
# ==============================

def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)


# ==============================
# JWT Token Functions
# ==============================

def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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
# Refresh Token
# ==============================

def refresh_access_token(refresh_token: str):

    try:

        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("user_id")

        if not user_id:
            return None

        new_access_token = create_access_token({
            "user_id": user_id
        })

        return new_access_token

    except JWTError:
        return None


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