from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from dependencies.auth import AuthContext
from models.marque import Marque
from schemas.marque_schema import MarqueCreate, MarqueUpdate
from services.notification_service import emit_fleet_event


def get_all_marques(db: Session):
    return db.query(Marque).order_by(Marque.id.asc()).all()


def get_marque_by_id(db: Session, marque_id: int):
    return db.query(Marque).filter(Marque.id == marque_id).first()


def get_marque_or_404(db: Session, marque_id: int) -> Marque:
    marque = get_marque_by_id(db, marque_id)
    if not marque:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marque not found",
        )
    return marque


def create_marque(db: Session, marque_data: MarqueCreate, current_user: AuthContext):
    existing = db.query(Marque).filter(Marque.nom == marque_data.nom).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Marque already exists",
        )

    marque = Marque(**marque_data.model_dump())
    db.add(marque)
    db.commit()
    db.refresh(marque)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_marque_created",
        title="Marque creee",
        message=f"Marque {marque.nom} creee.",
        metadata={"marque_id": int(marque.id), "nom": marque.nom},
    )
    return marque


def update_marque(db: Session, marque_id: int, marque_data: MarqueUpdate, current_user: AuthContext):
    marque = get_marque_or_404(db, marque_id)
    update_data = marque_data.model_dump(exclude_unset=True)

    if "nom" in update_data:
        existing = (
            db.query(Marque)
            .filter(Marque.nom == update_data["nom"], Marque.id != marque_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Marque already exists",
            )

    for field, value in update_data.items():
        setattr(marque, field, value)

    db.commit()
    db.refresh(marque)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_marque_updated",
        title="Marque mise a jour",
        message=f"Marque #{marque.id} mise a jour.",
        metadata={"marque_id": int(marque.id), "nom": marque.nom},
    )
    return marque


def delete_marque(db: Session, marque_id: int, current_user: AuthContext):
    marque = get_marque_or_404(db, marque_id)
    marque_id_value = int(marque.id)
    marque_nom = marque.nom
    db.delete(marque)
    db.commit()
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_marque_deleted",
        title="Marque supprimee",
        message=f"Marque {marque_nom} supprimee.",
        metadata={"marque_id": marque_id_value, "nom": marque_nom},
    )
