from datetime import datetime
from io import BytesIO

from fastapi import HTTPException
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from Controller.NotificationController import emit_finance_event
from Controller.ScopeController import get_allowed_location_ids
from Model.FinanceModels import Facture
from Schemas.FinanceSchemas import CreateFactureSchema, UpdateFactureSchema
from dependencies.FinanceDependencies import AuthContext


VALID_STATUSES = {"en_attente", "validee", "annulee", "payee", "paye"}


def _normalize_status(value: str) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"payee", "paye", "validee"}:
        return "payee"
    if normalized in {"annulee"}:
        return "annulee"
    return "en_attente"


def _is_in_scope(facture: Facture, user: AuthContext, allowed_location_ids: set[int] | None) -> bool:
    if user.is_super_admin:
        return True
    if allowed_location_ids is None:
        return True
    return int(facture.location_id) in allowed_location_ids


def _ensure_facture_scope(facture: Facture, user: AuthContext, allowed_location_ids: set[int] | None) -> None:
    if not _is_in_scope(facture, user, allowed_location_ids):
        raise HTTPException(status_code=403, detail="You can only access factures in your agence scope")


def create_facture(data: CreateFactureSchema, db: Session, user: AuthContext):
    allowed_location_ids = get_allowed_location_ids(user)
    if not user.is_super_admin and (allowed_location_ids is not None and int(data.location_id) not in allowed_location_ids):
        raise HTTPException(status_code=403, detail="You can only create factures for your agence locations")

    montant_ttc = data.montant_ht * (1 + data.tva / 100)

    facture = Facture(
        location_id=data.location_id,
        numero="TMP",
        montant_ht=data.montant_ht,
        tva=data.tva,
        montant_ttc=round(montant_ttc, 2),
        statut="en_attente",
    )

    db.add(facture)
    db.flush()
    facture.numero = f"FAC-{int(facture.id):06d}"

    db.commit()
    db.refresh(facture)
    emit_finance_event(
        user=user,
        event_type="finance_facture_created",
        title="Nouvelle facture creee",
        message=f"Facture {facture.numero} creee pour la location #{facture.location_id}.",
        metadata={"facture_id": int(facture.id), "location_id": int(facture.location_id)},
    )
    return facture


def get_all_factures(db: Session, user: AuthContext):
    query = db.query(Facture).filter(Facture.deleted_at == None)

    if user.is_super_admin:
        return query.order_by(Facture.id.desc()).all()

    allowed_location_ids = get_allowed_location_ids(user)
    if not allowed_location_ids:
        return []

    return query.filter(Facture.location_id.in_(allowed_location_ids)).order_by(Facture.id.desc()).all()


def get_facture_by_id(facture_id: int, db: Session, user: AuthContext):
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.deleted_at == None,
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")

    allowed_location_ids = get_allowed_location_ids(user)
    _ensure_facture_scope(facture, user, allowed_location_ids)

    return facture


def update_facture(facture_id: int, data: UpdateFactureSchema, db: Session, user: AuthContext):
    facture = get_facture_by_id(facture_id, db, user)

    if data.statut is not None:
        if data.statut.strip().lower() not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid facture status")
        facture.statut = _normalize_status(data.statut)

    if data.montant_ht is not None:
        tva = data.tva if data.tva is not None else facture.tva
        facture.montant_ht = data.montant_ht
        facture.tva = tva
        facture.montant_ttc = round(data.montant_ht * (1 + tva / 100), 2)

    db.commit()
    db.refresh(facture)
    emit_finance_event(
        user=user,
        event_type="finance_facture_updated",
        title="Facture mise a jour",
        message=f"Facture {facture.numero} mise a jour (statut: {facture.statut}).",
        metadata={"facture_id": int(facture.id), "location_id": int(facture.location_id), "statut": facture.statut},
    )
    return facture


def delete_facture(facture_id: int, db: Session, user: AuthContext):
    facture = get_facture_by_id(facture_id, db, user)
    facture.deleted_at = datetime.utcnow()
    db.commit()
    emit_finance_event(
        user=user,
        event_type="finance_facture_deleted",
        title="Facture supprimee",
        message=f"Facture {facture.numero} supprimee.",
        metadata={"facture_id": int(facture.id), "location_id": int(facture.location_id)},
    )
    return {"message": "Facture deleted successfully"}


def get_deleted_factures(db: Session, user: AuthContext):
    query = db.query(Facture).filter(Facture.deleted_at != None)

    if user.is_super_admin:
        return query.order_by(Facture.id.desc()).all()

    allowed_location_ids = get_allowed_location_ids(user)
    if not allowed_location_ids:
        return []

    return query.filter(Facture.location_id.in_(allowed_location_ids)).order_by(Facture.id.desc()).all()


def restore_facture(facture_id: int, db: Session, user: AuthContext):
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.deleted_at != None,
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found or not deleted")

    allowed_location_ids = get_allowed_location_ids(user)
    _ensure_facture_scope(facture, user, allowed_location_ids)

    facture.deleted_at = None
    db.commit()
    emit_finance_event(
        user=user,
        event_type="finance_facture_restored",
        title="Facture restauree",
        message=f"Facture {facture.numero} restauree.",
        metadata={"facture_id": int(facture.id), "location_id": int(facture.location_id)},
    )

    return {"message": "Facture restored successfully"}


def generate_facture_pdf(facture_id: int, db: Session, user: AuthContext) -> bytes:
    facture = get_facture_by_id(facture_id, db, user)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 60
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(50, y, "Facture")
    y -= 30

    pdf.setFont("Helvetica", 11)
    lines = [
        f"Numero: {facture.numero}",
        f"Facture ID: {facture.id}",
        f"Location ID: {facture.location_id}",
        f"Date emission: {facture.date_emission.strftime('%Y-%m-%d %H:%M:%S') if facture.date_emission else '-'}",
        f"Statut: {facture.statut}",
        "",
        f"Montant HT: {facture.montant_ht}",
        f"TVA (%): {facture.tva}",
        f"Montant TTC: {facture.montant_ttc}",
    ]

    for line in lines:
        pdf.drawString(50, y, line)
        y -= 20

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()
