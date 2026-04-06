from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from schemas.marque_schema import MarqueCreate, MarqueResponse, MarqueUpdate
from services.marque_service import (
    create_marque,
    delete_marque,
    get_all_marques,
    get_marque_or_404,
    update_marque,
)

router = APIRouter(prefix="/marques", tags=["Marques"])


@router.get("/", response_model=list[MarqueResponse])
def list_marques(db: Session = Depends(get_db)):
    return get_all_marques(db)


@router.get("/{marque_id}", response_model=MarqueResponse)
def get_marque(marque_id: int, db: Session = Depends(get_db)):
    return get_marque_or_404(db, marque_id)


@router.post("/", response_model=MarqueResponse, status_code=status.HTTP_201_CREATED)
def create_marque_endpoint(marque_data: MarqueCreate, db: Session = Depends(get_db)):
    return create_marque(db, marque_data)


@router.put("/{marque_id}", response_model=MarqueResponse)
def update_marque_endpoint(
    marque_id: int,
    marque_data: MarqueUpdate,
    db: Session = Depends(get_db),
):
    return update_marque(db, marque_id, marque_data)


@router.delete("/{marque_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_marque_endpoint(marque_id: int, db: Session = Depends(get_db)):
    delete_marque(db, marque_id)
