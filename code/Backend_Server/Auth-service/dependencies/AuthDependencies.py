from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from config.database import get_db
from Model.User import User
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS"))

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

        new_access_token = create_access_token({
            "user_id": user_id
        })

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

def get_current_user(
        token=Depends(security),
        db: Session = Depends(get_db)
):

    payload = decode_token(token.credentials)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == payload["user_id"]).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ============================
# Admin Required
# ============================

def admin_required(current_user: User = Depends(get_current_user)):

    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user
