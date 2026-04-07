"""
Tests de la route /api/auth/login.
"""


def test_login_user_success(client, employee_user, load_json_payload):
    """Doit authentifier un utilisateur existant."""
    payload = load_json_payload("login.json")

    response = client.post("/api/auth/login", json=payload)
    body = response.json()

    assert response.status_code == 200
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_user_invalid_password(client, employee_user, load_json_payload):
    """Doit retourner 401 si le mot de passe est incorrect."""
    payload = load_json_payload("login.json")
    payload["password"] = "WrongPassword!"

    response = client.post("/api/auth/login", json=payload)
    body = response.json()

    assert response.status_code == 401
    assert body["detail"] == "Invalid credentials"


def test_login_user_not_found(client, load_json_payload):
    """Doit retourner 401 si l'utilisateur n'existe pas."""
    payload = load_json_payload("login.json")
    payload["email"] = "notfound@erp.com"

    response = client.post("/api/auth/login", json=payload)
    body = response.json()

    assert response.status_code == 401
    assert body["detail"] == "Invalid credentials"


def test_login_user_inactive_account(client, db_session, employee_user, load_json_payload):
    """Doit retourner 403 si le compte utilisateur est desactive."""
    employee_user.actif = False
    db_session.commit()

    payload = load_json_payload("login.json")
    response = client.post("/api/auth/login", json=payload)
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Account is inactive. Please contact your admin."

