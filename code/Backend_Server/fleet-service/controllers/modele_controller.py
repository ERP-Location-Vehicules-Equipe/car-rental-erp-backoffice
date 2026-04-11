from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from dependencies.auth import get_current_user, super_admin_required
from schemas.modele_schema import ModeleCreate, ModeleResponse, ModeleUpdate
from services.modele_service import (
    create_modele,
    delete_modele,
    get_all_modeles,
    get_modele_or_404,
    update_modele,
)

router = APIRouter(prefix="/modeles", tags=["Modeles"])


@router.get("/", response_model=list[ModeleResponse])
def list_modeles(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    return get_all_modeles(db)


@router.get("/{modele_id}", response_model=ModeleResponse)
def get_modele(
    modele_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    return get_modele_or_404(db, modele_id)


@router.post("/", response_model=ModeleResponse, status_code=status.HTTP_201_CREATED)
def create_modele_endpoint(
    modele_data: ModeleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(super_admin_required),
):
    return create_modele(db, modele_data, current_user)


@router.put("/{modele_id}", response_model=ModeleResponse)
def update_modele_endpoint(
    modele_id: int,
    modele_data: ModeleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(super_admin_required),
):
    return update_modele(db, modele_id, modele_data, current_user)


@router.delete("/{modele_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_modele_endpoint(
    modele_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(super_admin_required),
):
    delete_modele(db, modele_id, current_user)
