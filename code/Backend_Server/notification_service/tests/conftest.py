import os
import sys
import types
import importlib.util
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from jose import jwt

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("SECRET_KEY", "test_notification_service_secret")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
os.environ.setdefault("SMTP_SERVER", "localhost")
os.environ.setdefault("SMTP_PORT", "1025")
os.environ.setdefault("SMTP_USERNAME", "test")
os.environ.setdefault("SMTP_PASSWORD", "test")
os.environ.setdefault("EMAIL_FROM", "noreply@example.com")
os.environ["DEBUG"] = "true"

TEST_DB_PATH = Path(__file__).resolve().parent / "test_notification.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

# Make tests resilient even if optional mail dependency isn't installed locally.
if importlib.util.find_spec("aiosmtplib") is None:
    fake_aiosmtplib = types.ModuleType("aiosmtplib")

    class _FakeSMTP:
        def __init__(self, *args, **kwargs):
            pass

        async def connect(self):
            return None

        async def starttls(self):
            return None

        async def login(self, *args, **kwargs):
            return None

        async def send_message(self, *args, **kwargs):
            return None

        async def quit(self):
            return None

    fake_aiosmtplib.SMTP = _FakeSMTP
    sys.modules["aiosmtplib"] = fake_aiosmtplib

from app.db.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.notification import Notification, NotificationRead  # noqa: F401, E402


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
