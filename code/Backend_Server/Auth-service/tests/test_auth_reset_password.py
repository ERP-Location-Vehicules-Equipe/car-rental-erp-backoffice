"""
Tests de la route /api/auth/reset-password.
"""


def test_reset_password_success(client, employee_user, load_json_payload):
    """
    Doit changer le mot de passe puis permettre un login avec le nouveau mot de passe.
    """
    payload = load_json_payload("reset_password.json")

    reset_response = client.post("/api/auth/reset-password", json=payload)
    reset_body = reset_response.json()

    assert reset_response.status_code == 200
    assert reset_body["message"] == "Password updated successfully"

    login_response = client.post(
        "/api/auth/login",
        json={"email": payload["email"], "password": payload["new_password"]},
    )

    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


def test_reset_password_user_not_found(client, load_json_payload):
    """Doit retourner 404 si l'utilisateur n'existe pas."""
    payload = load_json_payload("reset_password.json")
    payload["email"] = "inexistant@erp.com"

    response = client.post("/api/auth/reset-password", json=payload)
    body = response.json()

    assert response.status_code == 404
    assert body["detail"] == "User not found"

