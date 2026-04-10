from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from Controller.CompteController import (
    create_compte, get_all_comptes,
    get_compte_by_id, update_compte, delete_compte
)
from Schemas.FinanceSchemas import (
    CreateCompteSchema, UpdateCompteSchema,
    CompteResponseSchema, CompteListResponseSchema
)

from dependencies.FinanceDependencies import (
    admin_or_super_admin_required,
    employee_or_admin_required,
    get_current_user,
)

router = APIRouter(prefix="/comptes", tags=["Comptes Trésorerie"])

@router.post("/", response_model=CompteResponseSchema)
def create(
    data: CreateCompteSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return create_compte(data, db)

@router.get("/", response_model=CompteListResponseSchema)
def get_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"comptes": get_all_comptes(db, user)}

@router.get("/{compte_id}", response_model=CompteResponseSchema)
def get_one(compte_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_compte_by_id(compte_id, db)

@router.put("/{compte_id}", response_model=CompteResponseSchema)
def update(
    compte_id: int,
    data: UpdateCompteSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return update_compte(compte_id, data, db)

@router.delete("/{compte_id}")
def delete(
    compte_id: int,
    db: Session = Depends(get_db),
    admin=Depends(admin_or_super_admin_required),
):
    return delete_compte(compte_id, db)
