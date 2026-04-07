from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from schemas.entretien_schema import (
    EntretienCreate,
    EntretienResponse,
    EntretienUpdate,
)
from services.entretien_service import (
    create_entretien,
    delete_entretien,
    get_all_entretiens,
    get_entretien_or_404,
    get_vehicle_entretiens,
    update_entretien,
)

router = APIRouter(tags=["Entretiens"])


@router.post("/entretiens/", response_model=EntretienResponse, status_code=status.HTTP_201_CREATED)
def create_entretien_endpoint(
    entretien_data: EntretienCreate,
    db: Session = Depends(get_db),
):
    return create_entretien(db, entretien_data)


@router.get("/entretiens/", response_model=list[EntretienResponse])
def list_entretiens(db: Session = Depends(get_db)):
    return get_all_entretiens(db)


@router.get(
    "/vehicles/{vehicle_id}/entretiens",
    response_model=list[EntretienResponse],
)
def list_vehicle_entretiens(vehicle_id: int, db: Session = Depends(get_db)):
    return get_vehicle_entretiens(db, vehicle_id)


@router.get("/entretiens/{entretien_id}", response_model=EntretienResponse)
def get_entretien(entretien_id: int, db: Session = Depends(get_db)):
    return get_entretien_or_404(db, entretien_id)


@router.put("/entretiens/{entretien_id}", response_model=EntretienResponse)
def update_entretien_endpoint(
    entretien_id: int,
    entretien_data: EntretienUpdate,
    db: Session = Depends(get_db),
):
    return update_entretien(db, entretien_id, entretien_data)


@router.delete("/entretiens/{entretien_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entretien_endpoint(entretien_id: int, db: Session = Depends(get_db)):
    delete_entretien(db, entretien_id)
