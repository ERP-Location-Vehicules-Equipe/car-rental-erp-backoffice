from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.marque import Marque
from schemas.marque_schema import MarqueCreate, MarqueUpdate


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


def create_marque(db: Session, marque_data: MarqueCreate):
    marque = Marque(**marque_data.model_dump())
    db.add(marque)
    db.commit()
    db.refresh(marque)
    return marque


def update_marque(db: Session, marque_id: int, marque_data: MarqueUpdate):
    marque = get_marque_or_404(db, marque_id)
    update_data = marque_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(marque, field, value)

    db.commit()
    db.refresh(marque)
    return marque


def delete_marque(db: Session, marque_id: int):
    marque = get_marque_or_404(db, marque_id)
    db.delete(marque)
    db.commit()
