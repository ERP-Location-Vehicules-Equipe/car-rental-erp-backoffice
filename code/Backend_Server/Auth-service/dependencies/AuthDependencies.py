from datetime import datetime, timedelta
import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config.database import get_db
from Model.User import User

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

# Rôles supportés dans le service Auth.
ROLE_EMPLOYE = "employe"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


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
# Refresh Token
# ==============================
def refresh_access_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            return None

        new_access_token = create_access_token({"user_id": user_id})
        return new_access_token
    except JWTError:
        return None


# ==============================
# Decode Token
# ==============================
def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ============================
# Get Current User
# ============================
def get_current_user(token=Depends(security), db: Session = Depends(get_db)):
    payload = decode_token(token.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ============================
# Super Admin Required
# ============================
def super_admin_required(current_user: User = Depends(get_current_user)):
    # Seul le super admin peut accéder aux opérations critiques globales.
    if current_user.role != ROLE_SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super admin access required")

    return current_user


# ============================
# Admin Or Super Admin Required
# ============================
def admin_or_super_admin_required(current_user: User = Depends(get_current_user)):
    # Les routes de gestion utilisateurs acceptent admin et super_admin.
    if current_user.role not in (ROLE_ADMIN, ROLE_SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Admin or super admin access required")

    return current_user


# Compatibilité avec l'ancien code: admin_required reste disponible,
# mais redirige vers la nouvelle règle (admin OU super_admin).
def admin_required(current_user: User = Depends(get_current_user)):
    return admin_or_super_admin_required(current_user)
