"""
Tests des routes d'inscription et creation d'utilisateur.
"""


def test_register_user_success(client, load_json_payload):
    """Doit creer un utilisateur standard avec un payload valide."""
    payload = load_json_payload("register.json")

    response = client.post("/api/auth/register", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert body["message"] == "User created"
    assert body["user"] == payload["email"]


def test_register_user_invalid_email(client, load_json_payload):
    """Doit refuser un email invalide (validation Pydantic)."""
    payload = load_json_payload("register.json")
    payload["email"] = "email_invalide"

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422


def test_create_user_success(client, load_json_payload, super_admin_auth_header):
    """Doit creer un utilisateur avec role explicite via /create-user."""
    payload = load_json_payload("create_user.json")

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["message"] == "User created successfully"
    assert body["email"] == payload["email"]
    assert body["role"] == payload["role"]


def test_create_user_missing_required_field(client, load_json_payload, super_admin_auth_header):
    """Doit retourner 422 si un champ requis est absent."""
    payload = load_json_payload("create_user.json")
    payload.pop("role")

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )

    assert response.status_code == 422

