import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from main import app  # noqa: E402
from config.database import Base, get_db  # noqa: E402

# SQLite in-memory for tests
TEST_DATABASE_URL = "sqlite:///./test_finance.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    # Mock JWT token for tests — same SECRET_KEY as .env
    from jose import jwt
    token = jwt.encode(
        {"user_id": 1, "role": "admin", "agence_id": 1},
        "super_secret_key_123456",
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}
