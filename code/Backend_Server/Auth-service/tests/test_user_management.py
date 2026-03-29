"""
Tests des routes de gestion utilisateurs (admin + super admin).
"""

from Model.User import User
from dependencies.AuthDependencies import hash_password


def test_get_all_users_success_for_super_admin(
    client,
    super_admin_auth_header,
    admin_user,
    employee_user,
    employee_other_agence,
):
    """Un super admin doit recuperer tous les admins + employes de l'application."""
    response = client.get("/api/utilisateurs/", headers=super_admin_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert isinstance(body, list)
    assert any(user["email"] == employee_user.email for user in body)
    assert any(user["email"] == employee_other_agence.email for user in body)
    assert any(user["email"] == admin_user.email for user in body)
    assert all(user["role"] in ("admin", "employe") for user in body)


def test_get_all_users_admin_scope_only_employees_same_agence(
    client,
    admin_auth_header,
    employee_user,
    employee_other_agence,
):
    """Un admin ne voit que les employes de sa propre agence."""
    response = client.get("/api/utilisateurs/", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["email"] == employee_user.email
    assert body[0]["agence_id"] == employee_user.agence_id
    assert body[0]["role"] == "employe"
    assert body[0]["email"] != employee_other_agence.email


def test_get_all_users_forbidden_for_non_admin(client, employee_auth_header):
    """Un utilisateur non admin/super_admin doit recevoir 403."""
    response = client.get("/api/utilisateurs/", headers=employee_auth_header)
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin or super admin access required"


def test_get_user_by_id_success_admin_same_agence(client, admin_auth_header, employee_user):
    """Un admin peut lire un employe de sa propre agence."""
    response = client.get(f"/api/utilisateurs/{employee_user.id}", headers=admin_auth_header)
    body = response.json()

    assert response.status_code == 200
    assert body["id"] == employee_user.id
    assert body["email"] == employee_user.email


def test_get_user_by_id_forbidden_admin_other_agence(client, admin_auth_header, employee_other_agence):
    """Un admin ne peut pas lire un employe d'une autre agence."""
    response = client.get(
        f"/api/utilisateurs/{employee_other_agence.id}",
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Not enough permissions to manage this user"


def test_update_user_success_admin_same_agence(client, admin_auth_header, employee_user):
    """Un admin peut modifier nom/email/actif d'un employe de son agence."""
    payload = {
        "nom": "Employe Updated",
        "email": "employee.updated@erp.com",
        "agence_id": employee_user.agence_id,
        "role": employee_user.role,
        "actif": False,
    }

    response = client.put(
        f"/api/utilisateurs/{employee_user.id}",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["nom"] == payload["nom"]
    assert body["email"] == payload["email"]
    assert body["actif"] is False


def test_update_user_forbidden_admin_change_role(client, admin_auth_header, employee_user):
    """Un admin ne peut pas changer le role d'un utilisateur."""
    payload = {"role": "admin"}

    response = client.put(
        f"/api/utilisateurs/{employee_user.id}",
        json=payload,
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Admin cannot change user role"


def test_disable_enable_user_success_admin_same_agence(client, admin_auth_header, employee_user):
    """Un admin peut desactiver/reactiver un employe de son agence."""
    disable_response = client.patch(
        f"/api/utilisateurs/{employee_user.id}/disable",
        headers=admin_auth_header,
    )
    disable_body = disable_response.json()

    assert disable_response.status_code == 200
    assert disable_body["actif"] is False

    enable_response = client.patch(
        f"/api/utilisateurs/{employee_user.id}/enable",
        headers=admin_auth_header,
    )
    enable_body = enable_response.json()

    assert enable_response.status_code == 200
    assert enable_body["actif"] is True


def test_soft_delete_user_success_admin_same_agence(client, admin_auth_header, db_session):
    """Le soft delete doit rester fonctionnel dans le scope admin."""
    target = User(
        nom="Delete Me",
        email="delete.me@erp.com",
        password=hash_password("DeletePass123!"),
        role="employe",
        agence_id=1,
        actif=True,
    )
    db_session.add(target)
    db_session.commit()
    db_session.refresh(target)

    delete_response = client.delete(
        f"/api/utilisateurs/{target.id}",
        headers=admin_auth_header,
    )
    delete_body = delete_response.json()

    assert delete_response.status_code == 200
    assert delete_body["message"] == "User deleted successfully"

    refreshed = db_session.query(User).filter(User.id == target.id).first()
    assert refreshed.deleted_at is not None


def test_super_admin_can_manage_admin_user(client, super_admin_auth_header, admin_user):
    """Un super admin peut desactiver/reactiver un admin."""
    response = client.patch(
        f"/api/utilisateurs/{admin_user.id}/disable",
        headers=super_admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["actif"] is False


def test_super_admin_can_update_admin_role_and_agence(
    client,
    super_admin_auth_header,
    admin_user,
):
    """Un super admin peut modifier role/agence d'un admin."""
    payload = {
        "role": "employe",
        "agence_id": 2,
    }

    response = client.put(
        f"/api/utilisateurs/{admin_user.id}",
        json=payload,
        headers=super_admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 200
    assert body["role"] == "employe"
    assert body["agence_id"] == 2


def test_admin_cannot_manage_admin_user(client, admin_auth_header, db_session):
    """Un admin ne peut pas modifier un autre admin (meme agence ou non)."""
    target_admin = User(
        nom="Second Admin",
        email="second.admin@erp.com",
        password=hash_password("SecondAdminPass123!"),
        role="admin",
        agence_id=1,
        actif=True,
    )
    db_session.add(target_admin)
    db_session.commit()
    db_session.refresh(target_admin)

    response = client.patch(
        f"/api/utilisateurs/{target_admin.id}/disable",
        headers=admin_auth_header,
    )
    body = response.json()

    assert response.status_code == 403
    assert body["detail"] == "Not enough permissions to manage this user"
