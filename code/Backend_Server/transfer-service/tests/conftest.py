import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jose import jwt

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("SECRET_KEY", "test_transfer_service_secret")
os.environ.setdefault("ALGORITHM", "HS256")

TEST_DB_PATH = Path(__file__).resolve().parent / "test_transfer.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.transfer import Transfer  # noqa: F401, E402


def auth_headers(
    *,
    user_id: int = 1,
    role: str = "super_admin",
    agence_id: int | None = None,
    email: str = "test@example.com",
) -> dict[str, str]:
    payload: dict[str, int | str] = {
        "user_id": user_id,
        "role": role,
        "email": email,
    }
    if agence_id is not None:
        payload["agence_id"] = agence_id

    token = jwt.encode(payload, os.environ["SECRET_KEY"], algorithm=os.environ["ALGORITHM"])
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
