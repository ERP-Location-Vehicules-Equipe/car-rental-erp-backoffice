import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt


BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

ROLE_EMPLOYE = "employe"
ROLE_ADMIN = "admin"
ROLE_SUPER_ADMIN = "super_admin"
ALLOWED_ROLES = {ROLE_EMPLOYE, ROLE_ADMIN, ROLE_SUPER_ADMIN}

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer()


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


def verify_token(token: str) -> dict:
    if not SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SECRET_KEY not configured in transfer-service",
        )
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )

    payload = verify_token(credentials.credentials)

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
        token=credentials.credentials,
        email=email,
    )
