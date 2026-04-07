"""
Tests de la route profile utilisateur.
"""


def test_get_profile_success(client, employee_user, employee_auth_header):
    """Doit retourner le profil du user authentifie."""
    response = client.get("/api/utilisateurs/profile", headers=employee_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert body["email"] == employee_user.email
    assert body["role"] == employee_user.role


def test_get_profile_without_token(client):
    """Doit retourner 403 si aucun token n'est fourni."""
    response = client.get("/api/utilisateurs/profile")

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authenticated"


def test_get_profile_invalid_token(client):
    """Doit retourner 401 si le token est invalide."""
    response = client.get(
        "/api/utilisateurs/profile",
        headers={"Authorization": "Bearer invalid.token"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"

