from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from dotenv import load_dotenv
import os

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer()

ROLE_EMPLOYE = "employe"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"
ALLOWED_ROLES = {ROLE_EMPLOYE, ROLE_ADMIN, ROLE_SUPER_ADMIN}


@dataclass
class AuthContext:
    user_id: int
    role: str
    agence_id: int | None
    token: str
    email: str | None = None

    @property
    def is_super_admin(self) -> bool:
        return self.role == ROLE_SUPER_ADMIN

    @property
    def is_admin(self) -> bool:
        return self.role == ROLE_ADMIN

    @property
    def is_employe(self) -> bool:
        return self.role == ROLE_EMPLOYE


# ==============================
# Decode Token (from Auth-service)
# ==============================

def decode_token(token: str):
    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SECRET_KEY is not configured in finance-service",
        )

    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ==============================
# Get Current User (via JWT)
# ==============================

def get_current_user(token=Depends(security)) -> AuthContext:
    payload = decode_token(token.credentials)

    user_id = payload.get("user_id")
    role = payload.get("role")
    agence_id = payload.get("agence_id")
    email = payload.get("email")

    if user_id is None or role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required claims",
        )

    if role in (ROLE_ADMIN, ROLE_EMPLOYE) and agence_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing agence scope",
        )

    return AuthContext(
        user_id=int(user_id),
        role=str(role),
        agence_id=int(agence_id) if agence_id is not None else None,
        token=token.credentials,
        email=email,
    )


# ==============================
# Admin or super admin required
# ==============================

def admin_or_super_admin_required(
    current_user: AuthContext = Depends(get_current_user),
) -> AuthContext:
    if not (current_user.is_admin or current_user.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or super admin access required",
        )

    return current_user


def super_admin_required(
    current_user: AuthContext = Depends(get_current_user),
) -> AuthContext:
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


# ==============================
# Employee/Admin/Super admin required
# ==============================

def employee_or_admin_required(
    current_user: AuthContext = Depends(get_current_user),
) -> AuthContext:
    if not (current_user.is_employe or current_user.is_admin or current_user.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employee, admin or super admin access required",
        )

    return current_user
