from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer()


# ==============================
# Decode Token (from Auth-service)
# ==============================

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ==============================
# Get Current User (via JWT)
# ==============================

def get_current_user(token=Depends(security)):

    payload = decode_token(token.credentials)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload  # {"user_id": ..., "role": ...}


# ==============================
# Admin Required
# ==============================

def admin_required(current_user: dict = Depends(get_current_user)):

    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user


# ==============================
# Employee Required (employee OR admin)
# ==============================

def employee_required(current_user: dict = Depends(get_current_user)):

    if current_user.get("role") not in ["employe", "admin"]:
        raise HTTPException(status_code=403, detail="Employee access required")

    return current_user