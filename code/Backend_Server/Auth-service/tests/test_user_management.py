"""
Tests des routes de gestion utilisateurs (admin).
"""

from Model.User import User
from dependencies.AuthDependencies import hash_password


def test_get_all_users_success(client, db_session, admin_auth_header, admin_user, employee_user):
    """Un admin doit pouvoir recuperer la liste des utilisateurs."""
    response = client.get("/api/utilisateurs/", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert isinstance(body, list)
    assert len(body) >= 2
    assert any(user["email"] == admin_user.email for user in body)
    assert any(user["email"] == employee_user.email for user in body)


def test_get_all_users_forbidden_for_non_admin(client, employee_auth_header, employee_user):
    """Un utilisateur non admin doit recevoir 403."""
    response = client.get("/api/utilisateurs/", headers=employee_auth_header)
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin access required"


def test_get_user_by_id_success(client, admin_auth_header, employee_user):
    """Un admin doit pouvoir lire un utilisateur par ID."""
    response = client.get(f"/api/utilisateurs/{employee_user.id}", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert body["id"] == employee_user.id
    assert body["email"] == employee_user.email


def test_update_user_success(client, admin_auth_header, employee_user, load_json_payload):
    """Un admin doit pouvoir modifier les donnees d'un utilisateur."""
    payload = load_json_payload("update_user.json")

    response = client.put(
        f"/api/utilisateurs/{employee_user.id}",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["nom"] == payload["nom"]
    assert body["email"] == payload["email"]
    assert body["agence_id"] == payload["agence_id"]


def test_disable_user_success(client, admin_auth_header, employee_user):
    """Un admin doit pouvoir desactiver un utilisateur."""
    response = client.patch(
        f"/api/utilisateurs/{employee_user.id}/disable",
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["actif"] is False


def test_enable_user_success(client, admin_auth_header, employee_user):
    """Un admin doit pouvoir reactiver un utilisateur."""
    client.patch(f"/api/utilisateurs/{employee_user.id}/disable", headers=admin_auth_header)

    response = client.patch(
        f"/api/utilisateurs/{employee_user.id}/enable",
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["actif"] is True


def test_soft_delete_user_success(client, admin_auth_header, db_session):
    """Un delete doit faire un soft delete (deleted_at rempli) et retirer le user des listes."""
    target = User(
        nom="Delete Me",
        email="delete.me@erp.com",
        password=hash_password("DeletePass123!"),
        role="employe",
        agence_id=2,
        actif=True,
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    delete_response = client.delete(f"/api/utilisateurs/{target.id}", headers=admin_auth_header)
    delete_body = delete_response.json()

    assert delete_response.status_code == 200
    assert delete_body["message"] == "User deleted successfully"

    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.deleted_at is not None

    list_response = client.get("/api/utilisateurs/", headers=admin_auth_header)
    list_body = list_response.json()
    deleted_ids = [user["id"] for user in list_body]

    assert target.id not in deleted_ids

