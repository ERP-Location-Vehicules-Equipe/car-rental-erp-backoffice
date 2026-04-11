from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Controller.PaiementController import (
    create_paiement,
    delete_paiement,
    get_all_paiements,
    get_paiement_by_id,
    get_paiements_by_facture,
)
from Schemas.FinanceSchemas import (
    CreatePaiementSchema,
    PaiementListResponseSchema,
    PaiementResponseSchema,
)
from config.database import get_db
from dependencies.FinanceDependencies import (
    admin_or_super_admin_required,
    employee_or_admin_required,
    get_current_user,
)

router = APIRouter(prefix="/paiements", tags=["Paiements"])


@router.post("/", response_model=PaiementResponseSchema)
def create(
    data: CreatePaiementSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return create_paiement(data, db, user)


@router.get("/", response_model=PaiementListResponseSchema)
def get_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"paiements": get_all_paiements(db, user)}


@router.get("/facture/{facture_id}", response_model=PaiementListResponseSchema)
def get_by_facture(facture_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"paiements": get_paiements_by_facture(facture_id, db, user)}


@router.get("/{paiement_id}", response_model=PaiementResponseSchema)
def get_one(paiement_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_paiement_by_id(paiement_id, db, user)


@router.delete("/{paiement_id}")
def delete(
    paiement_id: int,
    db: Session = Depends(get_db),
    admin=Depends(admin_or_super_admin_required),
):
    return delete_paiement(paiement_id, db, admin)