from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from Controller.ChargeController import (
    create_charge,
    delete_charge,
    get_all_charges,
    get_charge_by_id,
    get_charges_by_vehicule,
    update_charge,
)
from Schemas.FinanceSchemas import (
    ChargeListResponseSchema,
    ChargeResponseSchema,
    CreateChargeSchema,
    UpdateChargeSchema,
)
from dependencies.FinanceDependencies import (
    employee_or_admin_required,
    get_current_user,
)

router = APIRouter(prefix="/charges", tags=["Charges"])


@router.post("/", response_model=ChargeResponseSchema)
def create(
    data: CreateChargeSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return create_charge(data, db, user)


@router.get("/", response_model=ChargeListResponseSchema)
def get_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"charges": get_all_charges(db, user)}


@router.get("/vehicule/{vehicule_id}", response_model=ChargeListResponseSchema)
def get_by_vehicule(vehicule_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"charges": get_charges_by_vehicule(vehicule_id, db, user)}


@router.get("/{charge_id}", response_model=ChargeResponseSchema)
def get_one(charge_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_charge_by_id(charge_id, db, user)


@router.put("/{charge_id}", response_model=ChargeResponseSchema)
def update(
    charge_id: int,
    data: UpdateChargeSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return update_charge(charge_id, data, db, user)


@router.delete("/{charge_id}")
def delete(
    charge_id: int,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return delete_charge(charge_id, db, user)
