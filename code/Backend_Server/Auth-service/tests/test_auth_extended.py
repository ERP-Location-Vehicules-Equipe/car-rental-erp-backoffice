"""
Tests supplementaires pour les routes /api/auth.
"""

from Model.User import User


def test_register_user_duplicate_email(client, load_json_payload):
    """Doit refuser l'inscription si l'email existe deja."""
    payload = load_json_payload("register.json")

    first_response = client.post("/api/auth/register", json=payload)
    assert first_response.status_code == 200

    second_response = client.post("/api/auth/register", json=payload)
    body = second_response.json()

    assert second_response.status_code == 400
    assert body["detail"] == "Email already exists"


def test_create_user_duplicate_email(client, load_json_payload):
    """Doit refuser la creation /create-user si l'email existe deja."""
    payload = load_json_payload("create_user.json")

    first_response = client.post("/api/auth/create-user", json=payload)
    assert first_response.status_code == 200

    second_response = client.post("/api/auth/create-user", json=payload)
    body = second_response.json()

    assert second_response.status_code == 400
    assert body["detail"] == "Email already exists"


def test_create_user_default_actif_true_when_missing(client, db_session, load_json_payload):
    """Doit utiliser actif=True par defaut si le champ est absent."""
    payload = load_json_payload("create_user.json")
    payload.pop("actif", None)
    payload["email"] = "created.default.active@erp.com"

    response = client.post("/api/auth/create-user", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body["email"] == payload["email"]
    assert body["role"] == payload["role"]

    created_user = db_session.query(User).filter(User.email == payload["email"]).first()
    assert created_user is not None
    assert created_user.actif is True
