from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from dependencies.auth import AuthContext
from models.categorie import Categorie
from schemas.categorie_schema import CategorieCreate, CategorieUpdate
from services.notification_service import emit_fleet_event


def get_all_categories(db: Session):
    return db.query(Categorie).order_by(Categorie.id.asc()).all()


def get_categorie_by_id(db: Session, categorie_id: int):
    return db.query(Categorie).filter(Categorie.id == categorie_id).first()


def get_categorie_or_404(db: Session, categorie_id: int) -> Categorie:
    categorie = get_categorie_by_id(db, categorie_id)
    if not categorie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categorie not found",
        )
    return categorie


def create_categorie(db: Session, categorie_data: CategorieCreate, current_user: AuthContext):
    existing = (
        db.query(Categorie)
        .filter(Categorie.libelle == categorie_data.libelle)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Categorie already exists",
        )

    categorie = Categorie(**categorie_data.model_dump())
    db.add(categorie)
    db.commit()
    db.refresh(categorie)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_categorie_created",
        title="Categorie creee",
        message=f"Categorie {categorie.libelle} creee.",
        metadata={"categorie_id": int(categorie.id), "libelle": categorie.libelle},
    )
    return categorie


def update_categorie(db: Session, categorie_id: int, categorie_data: CategorieUpdate, current_user: AuthContext):
    categorie = get_categorie_or_404(db, categorie_id)
    update_data = categorie_data.model_dump(exclude_unset=True)

    if "libelle" in update_data:
        existing = (
            db.query(Categorie)
            .filter(
                Categorie.libelle == update_data["libelle"],
                Categorie.id != categorie_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Categorie already exists",
            )

    for field, value in update_data.items():
        setattr(categorie, field, value)

    db.commit()
    db.refresh(categorie)
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_categorie_updated",
        title="Categorie mise a jour",
        message=f"Categorie #{categorie.id} mise a jour.",
        metadata={"categorie_id": int(categorie.id), "libelle": categorie.libelle},
    )
    return categorie


def delete_categorie(db: Session, categorie_id: int, current_user: AuthContext):
    categorie = get_categorie_or_404(db, categorie_id)
    categorie_id_value = int(categorie.id)
    categorie_label = categorie.libelle
    db.delete(categorie)
    db.commit()
    emit_fleet_event(
        current_user=current_user,
        event_type="fleet_categorie_deleted",
        title="Categorie supprimee",
        message=f"Categorie {categorie_label} supprimee.",
        metadata={"categorie_id": categorie_id_value, "libelle": categorie_label},
    )
