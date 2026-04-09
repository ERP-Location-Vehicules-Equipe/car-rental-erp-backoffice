from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.modele import Modele
from schemas.modele_schema import ModeleCreate, ModeleUpdate


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


def create_modele(db: Session, modele_data: ModeleCreate):
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
    return modele


def update_modele(db: Session, modele_id: int, modele_data: ModeleUpdate):
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
    return modele


def delete_modele(db: Session, modele_id: int):
    modele = get_modele_or_404(db, modele_id)
    db.delete(modele)
    db.commit()
