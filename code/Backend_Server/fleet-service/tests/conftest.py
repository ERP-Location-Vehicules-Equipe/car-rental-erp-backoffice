import os
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import inspect

_original_httpx_post = httpx.post


def _stub_finance_httpx_post(url, *args, **kwargs):
    if "/charges/" in str(url):

        class _Resp:
            status_code = 201

            def json(self):
                return {"id": 1}

        return _Resp()
    return _original_httpx_post(url, *args, **kwargs)

os.environ.setdefault("SECRET_KEY", "test_fleet_ci_secret")

TEST_DB_PATH = Path(__file__).resolve().parent / "test_fleet.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"

from db import Base, SessionLocal, engine  # noqa: E402
from main import app  # noqa: E402
from models.assurance import VehicleAssurance  # noqa: F401, E402
from models.entretien import VehicleEntretien  # noqa: F401, E402
from models.vehicle import Vehicle  # noqa: F401, E402

REQUIRED_TABLES = {
    "vehicles",
    "vehicle_entretiens",
    "vehicle_assurances",
    "categories",
    "marques",
    "modeles",
}


def _recreate_test_database() -> None:
    # Always start each test from a fresh SQLite file to avoid stale schema/data.
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    Base.metadata.create_all(bind=engine)
    existing_tables = set(inspect(engine).get_table_names())
    missing_tables = REQUIRED_TABLES - existing_tables
    if missing_tables:
        raise RuntimeError(f"Missing expected test tables: {sorted(missing_tables)}")


def _auth_headers() -> dict[str, str]:
    token = jwt.encode(
        {"user_id": 1, "role": "super_admin"},
        os.environ["SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _merge_headers(base: dict[str, str], extra: dict | None) -> dict[str, str]:
    merged = dict(base)
    if extra:
        merged.update(extra)
    return merged


class AuthedTestClient:
    """Wraps TestClient so every request sends a valid super_admin JWT."""

    def __init__(self, inner: TestClient, auth: dict[str, str]):
        self._inner = inner
        self._auth = auth

    def request(self, method: str, url: str, **kwargs):
        kwargs["headers"] = _merge_headers(self._auth, kwargs.get("headers"))
        return self._inner.request(method, url, **kwargs)

    def get(self, url: str, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs):
        return self.request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs):
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs):
        return self.request("DELETE", url, **kwargs)


@pytest.fixture(autouse=True)
def stub_finance_http(monkeypatch):
    monkeypatch.setattr(httpx, "post", _stub_finance_httpx_post)


@pytest.fixture(autouse=True)
def reset_database():
    _recreate_test_database()
    yield
    engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield AuthedTestClient(test_client, _auth_headers())


@pytest.fixture
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
