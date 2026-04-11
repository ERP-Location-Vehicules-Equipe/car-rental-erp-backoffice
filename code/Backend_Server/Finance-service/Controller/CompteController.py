from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from Model.FinanceModels import CompteTresorerie
from Controller.NotificationController import emit_finance_event
from Schemas.FinanceSchemas import CreateCompteSchema, UpdateCompteSchema
from dependencies.FinanceDependencies import AuthContext


def _resolve_target_agence_id(data_agence_id: int | None, user: AuthContext) -> int:
    if user.is_super_admin:
        if data_agence_id is None:
            raise HTTPException(status_code=400, detail="agence_id is required for super admin")
        return int(data_agence_id)

    if user.agence_id is None:
        raise HTTPException(status_code=403, detail="Your account is missing agence scope")

    if data_agence_id is not None and int(data_agence_id) != int(user.agence_id):
        raise HTTPException(status_code=403, detail="You can only manage comptes in your agence")

    return int(user.agence_id)


def _assert_compte_scope(compte: CompteTresorerie, user: AuthContext) -> None:
    if user.is_super_admin:
        return
    if user.agence_id is None:
        raise HTTPException(status_code=403, detail="Your account is missing agence scope")
    if compte.agence_id is not None and int(compte.agence_id) != int(user.agence_id):
        raise HTTPException(status_code=403, detail="You can only access comptes in your agence")


def create_compte(data: CreateCompteSchema, db: Session, user: AuthContext):
    agence_id = _resolve_target_agence_id(data.agence_id, user)

    existing_agence_compte = db.query(CompteTresorerie).filter(
        CompteTresorerie.deleted_at == None,
        CompteTresorerie.agence_id == agence_id,
    ).first()
    if existing_agence_compte:
        raise HTTPException(
            status_code=400,
            detail=f"Agence {agence_id} already has a compte. Only one compte is allowed per agence.",
        )

    compte = CompteTresorerie(
        nom=data.nom,
        type=data.type,
        agence_id=agence_id,
        solde_actuel=data.solde_actuel,
    )

    db.add(compte)
    db.commit()
    db.refresh(compte)
    emit_finance_event(
        user=user,
        event_type="finance_compte_created",
        title="Nouveau compte cree",
        message=f"Le compte {compte.nom} a ete cree.",
        agence_id=compte.agence_id,
        metadata={"compte_id": int(compte.id), "agence_id": compte.agence_id},
    )
    return compte


def get_all_comptes(db: Session, user: AuthContext):
    query = db.query(CompteTresorerie).filter(CompteTresorerie.deleted_at == None)
    if user.is_super_admin:
        return query.order_by(CompteTresorerie.id.desc()).all()

    if user.agence_id is None:
        return []

    return query.filter(CompteTresorerie.agence_id == user.agence_id).order_by(CompteTresorerie.id.desc()).all()


def get_compte_by_id(compte_id: int, db: Session, user: AuthContext):
    compte = db.query(CompteTresorerie).filter(
        CompteTresorerie.id == compte_id,
        CompteTresorerie.deleted_at == None,
    ).first()

    if not compte:
        raise HTTPException(status_code=404, detail="Compte not found")

    _assert_compte_scope(compte, user)
    return compte


def update_compte(compte_id: int, data: UpdateCompteSchema, db: Session, user: AuthContext):
    compte = get_compte_by_id(compte_id, db, user)

    if data.nom is not None:
        compte.nom = data.nom
    if data.type is not None:
        compte.type = data.type
    if data.solde_actuel is not None:
        compte.solde_actuel = data.solde_actuel

    db.commit()
    db.refresh(compte)
    emit_finance_event(
        user=user,
        event_type="finance_compte_updated",
        title="Compte mis a jour",
        message=f"Le compte {compte.nom} a ete modifie.",
        agence_id=compte.agence_id,
        metadata={"compte_id": int(compte.id), "agence_id": compte.agence_id},
    )
    return compte


def delete_compte(compte_id: int, db: Session, user: AuthContext):
    compte = get_compte_by_id(compte_id, db, user)
    compte.deleted_at = datetime.utcnow()
    db.commit()
    emit_finance_event(
        user=user,
        event_type="finance_compte_deleted",
        title="Compte supprime",
        message=f"Le compte {compte.nom} a ete supprime.",
        agence_id=compte.agence_id,
        metadata={"compte_id": int(compte.id), "agence_id": compte.agence_id},
    )
    return {"message": "Compte deleted successfully"}
