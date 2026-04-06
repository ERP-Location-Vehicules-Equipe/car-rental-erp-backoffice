from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.categorie import Categorie
from schemas.categorie_schema import CategorieCreate, CategorieUpdate


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


def create_categorie(db: Session, categorie_data: CategorieCreate):
    categorie = Categorie(**categorie_data.model_dump())
    db.add(categorie)
    db.commit()
    db.refresh(categorie)
    return categorie


def update_categorie(db: Session, categorie_id: int, categorie_data: CategorieUpdate):
    categorie = get_categorie_or_404(db, categorie_id)
    update_data = categorie_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(categorie, field, value)

    db.commit()
    db.refresh(categorie)
    return categorie


def delete_categorie(db: Session, categorie_id: int):
    categorie = get_categorie_or_404(db, categorie_id)
    db.delete(categorie)
    db.commit()
