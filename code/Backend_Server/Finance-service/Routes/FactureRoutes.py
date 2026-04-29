from io import BytesIO

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from Controller.FactureController import (
    create_facture,
    delete_facture,
    generate_facture_pdf,
    get_all_factures,
    get_deleted_factures,
    get_facture_by_id,
    restore_facture,
    update_facture,
)
from Schemas.FinanceSchemas import (
    CreateFactureSchema,
    FactureListResponseSchema,
    FactureResponseSchema,
    UpdateFactureSchema,
)
from config.database import get_db
from dependencies.FinanceDependencies import (
    admin_or_super_admin_required,
    employee_or_admin_required,
    get_current_user,
)

router = APIRouter(prefix="/factures", tags=["Factures"])


@router.post("/", response_model=FactureResponseSchema)
def create(
    data: CreateFactureSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return create_facture(data, db, user)


@router.get("/", response_model=FactureListResponseSchema)
def get_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return {"factures": get_all_factures(db, user)}


@router.get("/deleted")
def get_deleted(db: Session = Depends(get_db), admin=Depends(admin_or_super_admin_required)):
    return {"factures": get_deleted_factures(db, admin)}


@router.patch("/{facture_id}/restore")
def restore(facture_id: int, db: Session = Depends(get_db), admin=Depends(admin_or_super_admin_required)):
    return restore_facture(facture_id, db, admin)


@router.get("/{facture_id}/pdf")
def download_pdf(
    facture_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    pdf_bytes = generate_facture_pdf(facture_id, db, user)
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="facture_{facture_id}.pdf"'
        },
    )


@router.get("/{facture_id}", response_model=FactureResponseSchema)
def get_one(facture_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return get_facture_by_id(facture_id, db, user)


@router.put("/{facture_id}", response_model=FactureResponseSchema)
def update(
    facture_id: int,
    data: UpdateFactureSchema,
    db: Session = Depends(get_db),
    user=Depends(employee_or_admin_required),
):
    return update_facture(facture_id, data, db, user)


@router.delete("/{facture_id}")
def delete(
    facture_id: int,
    db: Session = Depends(get_db),
    admin=Depends(admin_or_super_admin_required),
):
    return delete_facture(facture_id, db, admin)