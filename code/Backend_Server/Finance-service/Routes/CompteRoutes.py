from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Controller.CompteController import (
    create_compte,
    delete_compte,
    get_all_comptes,
    get_compte_by_id,
    update_compte,
)
from Schemas.FinanceSchemas import (
    CompteListResponseSchema,
    CompteResponseSchema,
    CreateCompteSchema,
    UpdateCompteSchema,
)
from config.database import get_db
from dependencies.FinanceDependencies import (
    get_current_user,
    super_admin_required,
)

router = APIRouter(prefix="/comptes", tags=["Comptes Tresorerie"])


@router.post("/", response_model=CompteResponseSchema)
def create(
    data: CreateCompteSchema,
    db: Session = Depends(get_db),
    user=Depends(super_admin_required),
):
    return create_compte(data, db, user)


@router.get("/", response_model=CompteListResponseSchema)
def get_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"comptes": get_all_comptes(db, user)}


@router.get("/{compte_id}", response_model=CompteResponseSchema)
def get_one(compte_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_compte_by_id(compte_id, db, user)


@router.put("/{compte_id}", response_model=CompteResponseSchema)
def update(
    compte_id: int,
    data: UpdateCompteSchema,
    db: Session = Depends(get_db),
    user=Depends(super_admin_required),
):
    return update_compte(compte_id, data, db, user)


@router.delete("/{compte_id}")
def delete(
    compte_id: int,
    db: Session = Depends(get_db),
    user=Depends(super_admin_required),
):
    return delete_compte(compte_id, db, user)
