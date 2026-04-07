from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from Model.User import User
from dependencies.AuthDependencies import ROLE_ADMIN, ROLE_EMPLOYE, ROLE_SUPER_ADMIN


def _is_super_admin(actor: User) -> bool:
    return actor.role == ROLE_SUPER_ADMIN


def _is_admin(actor: User) -> bool:
    return actor.role == ROLE_ADMIN


def _assert_can_manage_target(actor: User, target: User):
    # Règles de sécurité:
    # - super_admin: peut gérer tous les admins + employés (toutes agences).
    # - super_admin ne gère pas d'autres super_admins via ces routes.
    # - admin: seulement les employés de sa propre agence.
    if _is_super_admin(actor) and target.role in (ROLE_ADMIN, ROLE_EMPLOYE):
        return

    if _is_admin(actor) and target.role == ROLE_EMPLOYE and target.agence_id == actor.agence_id:
        return

    raise HTTPException(status_code=403, detail="Not enough permissions to manage this user")


# ==============================
# Get All Users (scope selon rôle)
# ==============================
def get_all_users(db: Session, actor: User):
    if _is_super_admin(actor):
        # Le super admin gère les admins et employés de toute l'application.
        users = db.query(User).filter(
            User.deleted_at == None,
            User.role.in_([ROLE_ADMIN, ROLE_EMPLOYE]),
        ).all()
    elif _is_admin(actor):
        users = db.query(User).filter(
            User.deleted_at == None,
            User.role == ROLE_EMPLOYE,
            User.agence_id == actor.agence_id,
        ).all()
    else:
        raise HTTPException(status_code=403, detail="Admin or super admin access required")

    if not users:
        raise HTTPException(status_code=404, detail="No users found")

    return users


# ==============================
# Get User By ID (scope selon rôle)
# ==============================
def get_user_by_id(db: Session, user_id: int, actor: User):
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(actor, user)
    return user


# ==============================
# Update My Profile
# ==============================
def update_my_profile(db: Session, current_user: User, data):
    user = db.query(User).filter(User.id == current_user.id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.nom is not None:
        user.nom = data.nom

    if data.email is not None:
        existing_user = db.query(User).filter(User.email == data.email, User.id != user.id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = data.email

    db.commit()
    db.refresh(user)
    return user


# ==============================
# Update User (scope + restrictions admin)
# ==============================
def update_user(db: Session, user_id: int, data, actor: User):
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(actor, user)

    if data.nom is not None:
        user.nom = data.nom

    if data.email is not None:
        existing_user = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = data.email

    if _is_super_admin(actor):
        # Le super admin peut modifier rôle/agence pour admin et employé.
        # On bloque explicitement l'assignation du rôle super_admin via cette route.
        if data.role is not None:
            if data.role == ROLE_SUPER_ADMIN:
                raise HTTPException(
                    status_code=403,
                    detail="Cannot assign super admin role from this route",
                )
            user.role = data.role
        if data.agence_id is not None:
            user.agence_id = data.agence_id
    else:
        # Un admin ne peut pas changer le rôle ni l'agence d'un utilisateur.
        if data.role is not None and data.role != user.role:
            raise HTTPException(status_code=403, detail="Admin cannot change user role")
        if data.agence_id is not None and data.agence_id != user.agence_id:
            raise HTTPException(status_code=403, detail="Admin cannot change user agence")

    if hasattr(data, "actif") and data.actif is not None:
        user.actif = data.actif

    db.commit()
    db.refresh(user)
    return user


# ==============================
# Soft Delete User
# ==============================
def delete_user(db: Session, user_id: int, actor: User):
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(actor, user)

    user.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "User deleted successfully"}


# ==============================
# Disable User
# ==============================
def disable_user(db: Session, user_id: int, actor: User):
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(actor, user)

    user.actif = False
    db.commit()
    db.refresh(user)
    return user


# ==============================
# Enable User
# ==============================
def enable_user(db: Session, user_id: int, actor: User):
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(actor, user)

    user.actif = True
    db.commit()
    db.refresh(user)
    return user


# ==============================
# Restore Soft Deleted User
# ==============================
def restore_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id, User.deleted_at != None).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found or not deleted")

    user.deleted_at = None
    db.commit()
    db.refresh(user)
    return user
