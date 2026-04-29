from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from Controller.NotificationController import emit_finance_event
from Controller.ScopeController import get_allowed_location_ids, get_location_snapshot
from Model.FinanceModels import CompteTresorerie, Facture, Paiement
from Schemas.FinanceSchemas import CreatePaiementSchema
from dependencies.FinanceDependencies import AuthContext

DEFAULT_TVA = Decimal("20")


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _is_facture_in_scope(facture: Facture, user: AuthContext, allowed_location_ids: set[int] | None) -> bool:
    if user.is_super_admin:
        return True
    if allowed_location_ids is None:
        return True
    return int(facture.location_id) in allowed_location_ids


def _assert_facture_scope(facture: Facture, user: AuthContext, allowed_location_ids: set[int] | None) -> None:
    if not _is_facture_in_scope(facture, user, allowed_location_ids):
        raise HTTPException(status_code=403, detail="You can only access paiements in your agence scope")


def _get_agence_compte_or_404(db: Session, agence_id: int) -> CompteTresorerie:
    compte = db.query(CompteTresorerie).filter(
        CompteTresorerie.deleted_at == None,
        CompteTresorerie.agence_id == agence_id,
    ).order_by(CompteTresorerie.id.asc()).first()

    if not compte:
        raise HTTPException(
            status_code=400,
            detail=f"No compte configured for agence {agence_id}. Super admin must create it first.",
        )
    return compte


def _create_facture_for_location_if_missing(
    db: Session,
    location_snapshot: dict,
    location_id: int,
) -> Facture:
    montant_ttc = _to_decimal(location_snapshot.get("montant_total"))
    if montant_ttc <= 0:
        montant_ttc = Decimal("0")

    montant_ht = (montant_ttc / (Decimal("1") + (DEFAULT_TVA / Decimal("100")))) if montant_ttc > 0 else Decimal("0")
    montant_ht = montant_ht.quantize(Decimal("0.01"))

    facture = Facture(
        location_id=location_id,
        numero="TMP",
        montant_ht=montant_ht,
        tva=DEFAULT_TVA,
        montant_ttc=montant_ttc.quantize(Decimal("0.01")),
        statut="en_attente",
    )

    db.add(facture)
    db.flush()
    facture.numero = f"FAC-{int(facture.id):06d}"
    return facture


def _resolve_facture_and_location(
    data: CreatePaiementSchema,
    db: Session,
    user: AuthContext,
    allowed_location_ids: set[int] | None,
) -> tuple[Facture, dict]:
    location_id = int(data.location_id)
    location_snapshot = get_location_snapshot(location_id, user)

    facture = None
    if data.facture_id is not None:
        facture = db.query(Facture).filter(
            Facture.id == data.facture_id,
            Facture.deleted_at == None,
        ).first()

        if not facture:
            raise HTTPException(status_code=404, detail="Facture not found")

        if int(facture.location_id) != location_id:
            raise HTTPException(status_code=400, detail="Selected facture does not match selected location")

    if facture is None:
        facture = db.query(Facture).filter(
            Facture.location_id == location_id,
            Facture.deleted_at == None,
        ).order_by(Facture.id.desc()).first()

    if facture is None:
        facture = _create_facture_for_location_if_missing(db, location_snapshot, location_id)

    _assert_facture_scope(facture, user, allowed_location_ids)
    return facture, location_snapshot


def _refresh_facture_status(db: Session, facture: Facture) -> None:
    total_paye = (
        db.query(func.sum(Paiement.montant))
        .filter(
            Paiement.facture_id == facture.id,
            Paiement.deleted_at == None,
        )
        .scalar()
        or 0
    )

    total_paid_decimal = _to_decimal(total_paye)
    ttc = _to_decimal(facture.montant_ttc)
    facture.statut = "payee" if total_paid_decimal >= ttc else "en_attente"


def create_paiement(data: CreatePaiementSchema, db: Session, user: AuthContext):
    allowed_location_ids = get_allowed_location_ids(user)
    facture, location_snapshot = _resolve_facture_and_location(data, db, user, allowed_location_ids)
    if str(facture.statut or "").strip().lower() in {"payee", "validee", "paye"}:
        raise HTTPException(status_code=400, detail="This facture is already paid")

    agence_id = location_snapshot.get("agence_depart_id")
    if agence_id is None:
        raise HTTPException(status_code=400, detail="Location is missing agence_depart_id")

    compte = _get_agence_compte_or_404(db, int(agence_id))

    paiement = Paiement(
        facture_id=int(facture.id),
        location_id=int(facture.location_id),
        compte_id=int(compte.id),
        montant=data.montant,
        mode=data.mode,
        reference=data.reference,
        date_paiement=datetime.utcnow(),
    )

    db.add(paiement)
    db.flush()
    compte.solde_actuel = _to_decimal(compte.solde_actuel) + _to_decimal(data.montant)

    _refresh_facture_status(db, facture)

    db.commit()
    db.refresh(paiement)
    emit_finance_event(
        user=user,
        event_type="finance_paiement_created",
        title="Paiement enregistre",
        message=f"Paiement #{paiement.id} enregistre pour la facture {facture.numero}.",
        agence_id=int(agence_id),
        metadata={
            "paiement_id": int(paiement.id),
            "facture_id": int(facture.id),
            "location_id": int(facture.location_id),
            "compte_id": int(compte.id),
            "facture_statut": facture.statut,
        },
    )
    return paiement


def get_all_paiements(db: Session, user: AuthContext):
    query = db.query(Paiement).filter(Paiement.deleted_at == None)

    if user.is_super_admin:
        return query.order_by(Paiement.id.desc()).all()

    allowed_location_ids = get_allowed_location_ids(user)
    if not allowed_location_ids:
        return []

    return (
        query.join(Facture, Facture.id == Paiement.facture_id)
        .filter(
            Facture.deleted_at == None,
            Facture.location_id.in_(allowed_location_ids),
        )
        .order_by(Paiement.id.desc())
        .all()
    )


def get_paiements_by_facture(facture_id: int, db: Session, user: AuthContext):
    facture = db.query(Facture).filter(
        Facture.id == facture_id,
        Facture.deleted_at == None,
    ).first()

    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")

    allowed_location_ids = get_allowed_location_ids(user)
    _assert_facture_scope(facture, user, allowed_location_ids)

    return db.query(Paiement).filter(
        Paiement.facture_id == facture_id,
        Paiement.deleted_at == None,
    ).order_by(Paiement.id.desc()).all()


def get_paiement_by_id(paiement_id: int, db: Session, user: AuthContext):
    paiement = db.query(Paiement).filter(
        Paiement.id == paiement_id,
        Paiement.deleted_at == None,
    ).first()

    if not paiement:
        raise HTTPException(status_code=404, detail="Paiement not found")

    facture = db.query(Facture).filter(
        Facture.id == paiement.facture_id,
        Facture.deleted_at == None,
    ).first()
    if not facture:
        raise HTTPException(status_code=404, detail="Facture not found")

    allowed_location_ids = get_allowed_location_ids(user)
    _assert_facture_scope(facture, user, allowed_location_ids)

    return paiement


def delete_paiement(paiement_id: int, db: Session, user: AuthContext):
    paiement = get_paiement_by_id(paiement_id, db, user)

    facture = db.query(Facture).filter(
        Facture.id == paiement.facture_id,
        Facture.deleted_at == None,
    ).first()

    if paiement.compte_id is not None:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.id == paiement.compte_id,
            CompteTresorerie.deleted_at == None,
        ).first()
        if compte:
            compte.solde_actuel = _to_decimal(compte.solde_actuel) - _to_decimal(paiement.montant)

    paiement.deleted_at = datetime.utcnow()

    if facture:
        _refresh_facture_status(db, facture)

    db.commit()
    emit_finance_event(
        user=user,
        event_type="finance_paiement_deleted",
        title="Paiement supprime",
        message=f"Paiement #{paiement.id} supprime.",
        metadata={
            "paiement_id": int(paiement.id),
            "facture_id": int(paiement.facture_id),
            "location_id": int(paiement.location_id) if paiement.location_id is not None else None,
        },
    )
    return {"message": "Paiement deleted successfully"}
