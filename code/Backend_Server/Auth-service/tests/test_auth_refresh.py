"""
Tests de la route /api/auth/refresh.
"""


def test_refresh_token_success(client, employee_user, employee_refresh_token):
    """Doit retourner un nouvel access token avec un refresh token valide."""
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": employee_refresh_token},
    )
    body = response.json()

    assert response.status_code == 200
    assert "access_token" in body
    assert isinstance(body["access_token"], str)


def test_refresh_token_invalid(client):
    """Doit retourner 401 avec un refresh token invalide."""
    response = client.post(
        "/api/auth/refresh",
        json={"refresh_token": "invalid.token.value"},
    )
    body = response.json()

    assert response.status_code == 401
    assert body["detail"] == "Invalid refresh token"

