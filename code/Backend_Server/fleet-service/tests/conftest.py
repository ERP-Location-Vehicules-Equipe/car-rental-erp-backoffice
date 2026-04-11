import os
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from jose import jwt

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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


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
