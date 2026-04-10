from io import BytesIO
from fastapi import HTTPException
from sqlalchemy import func
from datetime import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from Model.FinanceModels import Facture
from Schemas.FinanceSchemas import CreateFactureSchema, UpdateFactureSchema


# ==============================
# Generate Facture Number
# ==============================

def generate_numero(db: Session) -> str:
    count = db.query(func.count(Facture.id)).scalar() + 1
    now = datetime.utcnow()
    return f"FAC-{now.year}{now.month:02d}-{count:04d}"


# ==============================
# Create Facture
# ==============================

def create_facture(data: CreateFactureSchema, db: Session):
    montant_ttc = data.montant_ht * (1 + data.tva / 100)

    facture = Facture(
        location_id=data.location_id,
        numero=0,  # temporary
        montant_ht=data.montant_ht,
        tva=data.tva,
        montant_ttc=round(montant_ttc, 2),
        statut="en_attente"
    )

    db.add(facture)
    db.flush()

    facture.numero = facture.id

    db.commit()
    db.refresh(facture)

    return facture


# ==============================
# Get All Factures
# ==============================

def get_all_factures(db: Session, user):
    # ✅ Removed agence_id filter — column doesn't exist in factures table
    return db.query(Facture).filter(
        Facture.deleted_at == None
    ).all()


# ==============================
# Get Facture by ID
# ==============================

def get_facture_by_id(facture_id: int, db: Session):
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.deleted_at == None
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")

    return facture


# ==============================
# Update Facture
# ==============================

def update_facture(facture_id: int, data: UpdateFactureSchema, db: Session):
    facture = get_facture_by_id(facture_id, db)

    if data.statut is not None:
        facture.statut = data.statut

    if data.montant_ht is not None:
        tva = data.tva if data.tva is not None else facture.tva
        facture.montant_ht = data.montant_ht
        facture.tva = tva
        facture.montant_ttc = round(data.montant_ht * (1 + tva / 100), 2)

    db.commit()
    db.refresh(facture)

    return facture


# ==============================
# Soft Delete Facture
# ==============================

def delete_facture(facture_id: int, db: Session):
    facture = get_facture_by_id(facture_id, db)
    facture.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Facture deleted successfully"}


# ==============================
# Get Deleted Factures
# ==============================

def get_deleted_factures(db: Session):
    return db.query(Facture).filter(
        Facture.deleted_at != None
    ).all()


# ==============================
# Restore Facture
# ==============================

def restore_facture(facture_id: int, db: Session):
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.deleted_at != None
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found or not deleted")

    facture.deleted_at = None
    db.commit()

    return {"message": "Facture restored successfully"}


def generate_facture_pdf(facture_id: int, db: Session) -> bytes:
    facture = get_facture_by_id(facture_id, db)

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
