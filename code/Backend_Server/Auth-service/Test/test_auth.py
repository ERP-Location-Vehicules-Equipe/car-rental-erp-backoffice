import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_register():

    response = client.post(
        "/api/auth/register",
        json={
            "nom": "Test User",
            "email": "test@erp.com",
            "password": "123456",
            "agence_id": 1
        }
    )

    assert response.status_code == 200
    assert "user" in response.json()


def test_login():

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@erp.com",
            "password": "123456"
        }
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_refresh_token():

    login = client.post(
        "/api/auth/login",
        json={
            "email": "test@erp.com",
            "password": "123456"
        }
    )

    refresh_token = login.json()["refresh_token"]

    response = client.post(
        "/api/auth/refresh",
        json={
            "refresh_token": refresh_token
        }
    )

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_reset_password():

    response = client.post(
        "/api/auth/reset-password",
        json={
            "email": "test@erp.com",
            "new_password": "12345678"
        }
    )

    assert response.status_code == 200