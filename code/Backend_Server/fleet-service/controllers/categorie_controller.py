from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from db import get_db
from dependencies.auth import get_current_user, super_admin_required
from schemas.categorie_schema import (
    CategorieCreate,
    CategorieResponse,
    CategorieUpdate,
)
from services.categorie_service import (
    create_categorie,
    delete_categorie,
    get_all_categories,
    get_categorie_or_404,
    update_categorie,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("/", response_model=list[CategorieResponse])
def list_categories(
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    return get_all_categories(db)


@router.get("/{categorie_id}", response_model=CategorieResponse)
def get_categorie(
    categorie_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(get_current_user),
):
    return get_categorie_or_404(db, categorie_id)


@router.post("/", response_model=CategorieResponse, status_code=status.HTTP_201_CREATED)
def create_categorie_endpoint(
    categorie_data: CategorieCreate,
    db: Session = Depends(get_db),
    _current_user=Depends(super_admin_required),
):
    return create_categorie(db, categorie_data)


@router.put("/{categorie_id}", response_model=CategorieResponse)
def update_categorie_endpoint(
    categorie_id: int,
    categorie_data: CategorieUpdate,
    db: Session = Depends(get_db),
    _current_user=Depends(super_admin_required),
):
    return update_categorie(db, categorie_id, categorie_data)


@router.delete("/{categorie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_categorie_endpoint(
    categorie_id: int,
    db: Session = Depends(get_db),
    _current_user=Depends(super_admin_required),
):
    delete_categorie(db, categorie_id)
