from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from dependencies.auth import AuthContext
from models.modele import Modele
from schemas.modele_schema import ModeleCreate, ModeleUpdate
from services.notification_service import emit_fleet_event


def get_all_modeles(db: Session):
    return db.query(Modele).order_by(Modele.id.asc()).all()


def get_modele_by_id(db: Session, modele_id: int):
    return db.query(Modele).filter(Modele.id == modele_id).first()


def get_modele_or_404(db: Session, modele_id: int) -> Modele:
    modele = get_modele_by_id(db, modele_id)
    if not modele:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modele not found",
        )
    return modele


def create_modele(db: Session, modele_data: ModeleCreate, current_user: AuthContext):
    existing = (
        db.query(Modele)
        .filter(
            Modele.nom == modele_data.nom,
            Modele.marque_id == modele_data.marque_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modele already exists for this marque",
        )

    modele = Modele(**modele_data.model_dump())
    db.add(modele)
    db.commit()
    db.refresh(modele)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_modele_created",
        title="Modele cree",
        message=f"Modele {modele.nom} cree.",
        metadata={"modele_id": int(modele.id), "nom": modele.nom, "marque_id": int(modele.marque_id)},
    )
    return modele


def update_modele(db: Session, modele_id: int, modele_data: ModeleUpdate, current_user: AuthContext):
    modele = get_modele_or_404(db, modele_id)
    update_data = modele_data.model_dump(exclude_unset=True)

    candidate_nom = update_data.get("nom", modele.nom)
    candidate_marque_id = update_data.get("marque_id", modele.marque_id)
    duplicate = (
        db.query(Modele)
        .filter(
            Modele.nom == candidate_nom,
            Modele.marque_id == candidate_marque_id,
            Modele.id != modele_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Modele already exists for this marque",
        )

    for field, value in update_data.items():
        setattr(modele, field, value)

    db.commit()
    db.refresh(modele)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_modele_updated",
        title="Modele mis a jour",
        message=f"Modele #{modele.id} mis a jour.",
        metadata={"modele_id": int(modele.id), "nom": modele.nom, "marque_id": int(modele.marque_id)},
    )
    return modele


def delete_modele(db: Session, modele_id: int, current_user: AuthContext):
    modele = get_modele_or_404(db, modele_id)
    modele_id_value = int(modele.id)
    modele_nom = modele.nom
    marque_id = int(modele.marque_id)
    db.delete(modele)
    db.commit()
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_modele_deleted",
        title="Modele supprime",
        message=f"Modele {modele_nom} supprime.",
        metadata={"modele_id": modele_id_value, "nom": modele_nom, "marque_id": marque_id},
    )
