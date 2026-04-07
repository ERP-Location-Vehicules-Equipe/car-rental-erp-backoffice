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


def test_create_user_duplicate_email(client, load_json_payload, super_admin_auth_header):
    """Doit refuser la creation /create-user si l'email existe deja."""
    payload = load_json_payload("create_user.json")

    first_response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )
    assert first_response.status_code == 200

    second_response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )
    body = second_response.json()

    assert second_response.status_code == 400
    assert body["detail"] == "Email already exists"


def test_create_user_default_actif_true_when_missing(
    client,
    db_session,
    load_json_payload,
    super_admin_auth_header,
):
    """Doit utiliser actif=True par defaut si le champ est absent."""
    payload = load_json_payload("create_user.json")
    payload.pop("actif", None)
    payload["email"] = "created.default.active@erp.com"

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["email"] == payload["email"]
    assert body["role"] == payload["role"]

    created_user = db_session.query(User).filter(User.email == payload["email"]).first()
    assert created_user is not None
    assert created_user.actif is True


def test_create_user_requires_authentication(client, load_json_payload):
    """Doit refuser /create-user sans token."""
    payload = load_json_payload("create_user.json")
    response = client.post("/api/auth/create-user", json=payload)

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authenticated"


def test_admin_cannot_create_admin_user(client, load_json_payload, admin_auth_header):
    """Un admin ne peut pas créer un autre admin."""
    payload = load_json_payload("create_user.json")
    payload["email"] = "admin.created.by.admin@erp.com"
    payload["role"] = "admin"

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin can only create employe users"


def test_admin_cannot_create_employee_in_other_agence(client, load_json_payload, admin_auth_header):
    """Un admin est limité à sa propre agence lors de la création."""
    payload = load_json_payload("create_user.json")
    payload["email"] = "employee.other.agence@erp.com"
    payload["role"] = "employe"
    payload["agence_id"] = 2

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin can only create users in their own agence"


def test_admin_can_create_employee_in_same_agence(client, load_json_payload, admin_auth_header):
    """Un admin peut créer un employé de sa propre agence."""
    payload = load_json_payload("create_user.json")
    payload["email"] = "employee.same.agence@erp.com"
    payload["role"] = "employe"
    payload["agence_id"] = 1

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["role"] == "employe"


def test_cannot_create_second_super_admin(
    client,
    load_json_payload,
    super_admin_auth_header,
    super_admin_user,
):
    """Il ne doit exister qu'un seul super admin actif."""
    payload = load_json_payload("create_user.json")
    payload["email"] = "second.super.admin@erp.com"
    payload["role"] = "super_admin"
    payload["agence_id"] = 1

    response = client.post(
        "/api/auth/create-user",
        json=payload,
        headers=super_admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 400
    assert body["detail"] == "Only one super admin is allowed"
