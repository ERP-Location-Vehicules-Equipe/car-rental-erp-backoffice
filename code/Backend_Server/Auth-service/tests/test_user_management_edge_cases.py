"""
Tests supplementaires pour les routes /api/utilisateurs.
"""


def test_get_user_by_id_not_found(client, admin_auth_header):
    """Doit retourner 404 pour un utilisateur inexistant."""
    response = client.get("/api/utilisateurs/9999", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 404
    assert body["detail"] == "User not found"


def test_update_user_duplicate_email(client, admin_auth_header, admin_user, employee_user):
    """Doit refuser update si l'email existe deja sur un autre utilisateur."""
    payload = {
        "nom": employee_user.nom,
        "email": admin_user.email,
        "role": employee_user.role,
        "agence_id": employee_user.agence_id,
        "actif": employee_user.actif,
    }

    response = client.put(
        f"/api/utilisateurs/{employee_user.id}",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 400
    assert body["detail"] == "Email already exists"


def test_delete_user_not_found(client, admin_auth_header):
    """Doit retourner 404 si le user a supprimer n'existe pas."""
    response = client.delete("/api/utilisateurs/9999", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 404
    assert body["detail"] == "User not found"


def test_get_soft_deleted_user_returns_404(client, admin_auth_header, employee_user):
    """Un utilisateur soft delete ne doit plus etre accessible par ID."""
    delete_response = client.delete(
        f"/api/utilisateurs/{employee_user.id}",
        headers=admin_auth_header,
    )
    assert delete_response.status_code == 200

    get_response = client.get(
        f"/api/utilisateurs/{employee_user.id}",
        headers=admin_auth_header,
    )
    body = get_response.json()

    assert get_response.status_code == 404
    assert body["detail"] == "User not found"


def test_update_user_forbidden_for_non_admin(client, employee_auth_header, employee_user):
    """Un employe ne doit pas pouvoir modifier un utilisateur."""
    payload = {
        "nom": "Unauthorized Update",
        "email": "unauthorized.update@erp.com",
        "role": "employe",
        "agence_id": employee_user.agence_id,
        "actif": True,
    }

    response = client.put(
        f"/api/utilisateurs/{employee_user.id}",
        json=payload,
        headers=employee_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin access required"

