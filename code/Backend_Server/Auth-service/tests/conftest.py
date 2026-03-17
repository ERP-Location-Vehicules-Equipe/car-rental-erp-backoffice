"""
Configuration globale pytest pour Auth Service.

Ce fichier fournit:
- une base SQLite de test
- un TestClient FastAPI
- des fixtures d'utilisateurs
- des tokens JWT
- un chargeur JSON pour les payloads
"""

import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ajoute la racine du microservice au PYTHONPATH pour les imports locaux.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Variables d'environnement de test (definies AVANT les imports applicatifs)
os.environ["DATABASE_URL"] = "sqlite:///./test_auth_service_bootstrap.db"
os.environ["SECRET_KEY"] = "test_secret_key_for_pytest"
os.environ["ALGORITHM"] = "HS256"
os.environ["ACCESS_TOKEN_EXPIRE_HOURS"] = "1"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"

from config.database import Base, get_db  # noqa: E402
from dependencies.AuthDependencies import (  # noqa: E402
    create_access_token,
    create_refresh_token,
    hash_password,
)
from main import app  # noqa: E402
from Model.User import User  # noqa: E402


TEST_DATABASE_URL = "sqlite:///./test_auth_service.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Cree une base propre pour chaque test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """
    TestClient avec override de la dependance get_db
    pour forcer l'utilisation de la base de test.
    """

    def _get_test_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_test_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def admin_user(db_session):
    """Utilisateur admin pour tests de routes protegees admin."""
    user = User(
        nom="Admin Test",
        email="admin@erp.com",
        password=hash_password("AdminPass123!"),
        role="admin",
        agence_id=1,
        actif=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def employee_user(db_session):
    """Utilisateur employe standard pour login/profile."""
    user = User(
        nom="Employe Test",
        email="employee@erp.com",
        password=hash_password("EmployeePass123!"),
        role="employe",
        agence_id=1,
        actif=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_token(admin_user):
    """JWT admin."""
    return create_access_token(
        {"user_id": admin_user.id, "email": admin_user.email, "role": admin_user.role}
    )


@pytest.fixture(scope="function")
def employee_token(employee_user):
    """JWT employe."""
    return create_access_token(
        {
            "user_id": employee_user.id,
            "email": employee_user.email,
            "role": employee_user.role,
        }
    )


@pytest.fixture(scope="function")
def employee_refresh_token(employee_user):
    """Refresh token valide pour l'utilisateur employe."""
    return create_refresh_token({"user_id": employee_user.id})


@pytest.fixture(scope="function")
def admin_auth_header(admin_token):
    """Header Authorization pour admin."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="function")
def employee_auth_header(employee_token):
    """Header Authorization pour employe."""
    return {"Authorization": f"Bearer {employee_token}"}


@pytest.fixture(scope="session")
def load_json_payload():
    """
    Charge les payloads JSON depuis tests/json.
    Usage: payload = load_json_payload("register.json")
    """
    base_dir = Path(__file__).parent / "json"

    def _loader(filename: str):
        with open(base_dir / filename, "r", encoding="utf-8") as file:
            return json.load(file)

    return _loader

