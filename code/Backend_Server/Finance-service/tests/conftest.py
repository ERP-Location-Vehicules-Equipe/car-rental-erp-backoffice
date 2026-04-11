import os
import sys
from pathlib import Path

# Obligatoire avant `import main` : config.database appelle create_engine(DATABASE_URL)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_finance.db")
os.environ.setdefault("SECRET_KEY", "super_secret_key_123456")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

from main import app  # noqa: E402
from config.database import Base, get_db  # noqa: E402

TEST_DATABASE_URL = os.environ["DATABASE_URL"]
_engine_kwargs = {}
if str(TEST_DATABASE_URL).startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
engine = create_engine(TEST_DATABASE_URL, **_engine_kwargs)
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
    from decimal import Decimal

    from Model.FinanceModels import CompteTresorerie

    db = TestingSessionLocal()
    try:
        exists = (
            db.query(CompteTresorerie)
            .filter(CompteTresorerie.deleted_at == None, CompteTresorerie.agence_id == 1)
            .first()
        )
        if not exists:
            # SQLite + BigInteger PK : pas d'auto-increment fiable → id explicite
            db.add(
                CompteTresorerie(
                    id=1,
                    nom="Compte test CI",
                    type="banque",
                    agence_id=1,
                    solde_actuel=Decimal("100000.00"),
                )
            )
            db.commit()
    finally:
        db.close()

    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def stub_location_service_scope(monkeypatch):
    """Evite les appels HTTP au location-service (502 en CI)."""
    from Controller import ScopeController

    def _fake_fetch_locations(user):
        _ = user
        return [
            {
                "id": 1,
                "agence_depart_id": 1,
                "montant_total": 2400.0,
            },
        ]

    monkeypatch.setattr(ScopeController, "_fetch_locations", _fake_fetch_locations)


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
