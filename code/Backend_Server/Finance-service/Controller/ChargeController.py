import os
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Controller.NotificationController import emit_finance_event
from dependencies.FinanceDependencies import AuthContext
from Model.FinanceModels import Charge, CompteTresorerie
from Schemas.FinanceSchemas import CreateChargeSchema, UpdateChargeSchema

FLEET_SERVICE_URL = os.getenv("FLEET_SERVICE_URL", "http://fleet_service:8004")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _assert_charge_scope(charge: Charge, user: AuthContext) -> None:
    if user.is_super_admin:
        return

    if charge.agence_id is not None and user.agence_id is not None and int(charge.agence_id) != int(user.agence_id):
        raise HTTPException(status_code=403, detail="You can only access charges in your agence")


def _resolve_charge_agence_id(data: CreateChargeSchema, user: AuthContext) -> int:
    if user.is_super_admin:
        if data.agence_id is None:
            raise HTTPException(status_code=400, detail="agence_id is required")
        return int(data.agence_id)

    if user.agence_id is None:
        raise HTTPException(status_code=403, detail="Your account is missing agence scope")

    if data.agence_id is not None and int(data.agence_id) != int(user.agence_id):
        raise HTTPException(status_code=403, detail="You can only create charges in your agence")

    return int(user.agence_id)


def _response_json_safe(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is not None:
                return parsed.astimezone().replace(tzinfo=None)
            return parsed
        except ValueError:
            return None
    return None


def _find_matching_entretien(charge: Charge, entretiens: list[dict]) -> int | None:
    if charge.source_type and str(charge.source_type).strip().lower() == "entretien" and charge.source_ref_id:
        return int(charge.source_ref_id)

    target_type = (charge.categorie_charge or "").strip().lower() or None
    try:
        target_cout = float(charge.montant) if charge.montant is not None else None
    except (TypeError, ValueError, InvalidOperation):
        target_cout = None
    target_date = _parse_datetime(charge.date_charge)

    candidates: list[tuple[float, int]] = []

    for item in entretiens:
        entretien_id = item.get("id")
        if not entretien_id:
            continue

        if target_type:
            item_type = str(item.get("type_entretien") or "").strip().lower()
            if item_type != target_type:
                continue

        if target_cout is not None:
            try:
                item_cout = float(item.get("cout"))
            except (TypeError, ValueError):
                continue
            if abs(item_cout - target_cout) > 0.01:
                continue

        distance_seconds = 0.0
        if target_date is not None:
            item_date = _parse_datetime(item.get("date_debut"))
            if item_date is None:
                distance_seconds = 10_000_000.0
            else:
                distance_seconds = abs((item_date - target_date).total_seconds())

        candidates.append((distance_seconds, int(entretien_id)))

    if not candidates:
        return None

    candidates.sort(key=lambda pair: (pair[0], -pair[1]))
    return candidates[0][1]


def _delete_related_entretien_if_needed(charge: Charge, user: AuthContext) -> None:
    if (charge.type or "").strip().lower() != "entretien":
        return
    if charge.vehicule_id is None:
        return

    headers = {"Authorization": f"Bearer {user.token}"}

    try:
        list_response = httpx.get(
            f"{FLEET_SERVICE_URL.rstrip('/')}/vehicles/{int(charge.vehicule_id)}/entretiens",
            headers=headers,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Unable to reach fleet service for entretien sync")

    list_response_json = _response_json_safe(list_response)
    if list_response.status_code == 404:
        return
    if list_response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Not allowed to sync entretien deletion in fleet service")
    if list_response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Fleet service error while syncing entretien deletion")
    if list_response.status_code >= 400:
        detail = (list_response_json or {}).get("detail", "Unable to list entretiens from fleet service")
        raise HTTPException(status_code=400, detail=detail)

    if not isinstance(list_response_json, list):
        return

    entretien_id = _find_matching_entretien(charge, list_response_json)
    if not entretien_id:
        return

    try:
        delete_response = httpx.delete(
            f"{FLEET_SERVICE_URL.rstrip('/')}/entretiens/{entretien_id}",
            headers=headers,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Unable to reach fleet service for entretien deletion")

    if delete_response.status_code in {204, 404}:
        return
    if delete_response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Not allowed to delete related entretien in fleet service")
    if delete_response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Fleet service error while deleting related entretien")
    if delete_response.status_code >= 400:
        detail = (_response_json_safe(delete_response) or {}).get("detail", "Unable to delete related entretien")
        raise HTTPException(status_code=400, detail=detail)


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


def _emit_low_balance_notification(user: AuthContext, agence_id: int, compte: CompteTresorerie) -> None:
    solde = _to_decimal(compte.solde_actuel)
    if solde >= Decimal("0"):
        return

    emit_finance_event(
        user=user,
        event_type="finance_compte_overdraft",
        title="Alerte solde negatif",
        message=(
            f"Le compte {compte.nom} de l'agence {agence_id} est en decouvert "
            f"(solde: {solde}). Merci de crediter le compte."
        ),
        agence_id=agence_id,
        metadata={
            "compte_id": int(compte.id),
            "agence_id": agence_id,
            "solde_actuel": str(solde),
            "alert_type": "overdraft",
        },
    )


def create_charge(data: CreateChargeSchema, db: Session, user: AuthContext):
    agence_id = _resolve_charge_agence_id(data, user)
    compte = _get_agence_compte_or_404(db, agence_id)

    charge = Charge(
        type=data.type,
        vehicule_id=data.vehicule_id,
        agence_id=agence_id,
        compte_id=int(compte.id),
        source_type=data.source_type,
        source_ref_id=data.source_ref_id,
        categorie_charge=data.categorie_charge,
        montant=data.montant,
        date_charge=data.date_charge or datetime.utcnow(),
        description=data.description,
    )

    db.add(charge)
    compte.solde_actuel = _to_decimal(compte.solde_actuel) - _to_decimal(data.montant)
    db.commit()
    db.refresh(charge)
    emit_finance_event(
        user=user,
        event_type="finance_charge_created",
        title="Nouvelle charge creee",
        message=f"Charge #{charge.id} ({charge.type}) creee.",
        agence_id=charge.agence_id,
        metadata={"charge_id": int(charge.id), "agence_id": charge.agence_id, "compte_id": charge.compte_id},
    )
    _emit_low_balance_notification(user, agence_id, compte)

    return charge


def get_all_charges(db: Session, user: AuthContext):
    query = db.query(Charge).filter(Charge.deleted_at == None)

    if user.is_super_admin:
        return query.order_by(Charge.id.desc()).all()

    return query.filter(Charge.agence_id == user.agence_id).order_by(Charge.id.desc()).all()


def get_charges_by_vehicule(vehicule_id: int, db: Session, user: AuthContext):
    query = db.query(Charge).filter(
        Charge.vehicule_id == vehicule_id,
        Charge.deleted_at == None,
    )

    if user.is_super_admin:
        return query.order_by(Charge.id.desc()).all()

    return query.filter(Charge.agence_id == user.agence_id).order_by(Charge.id.desc()).all()


def get_charge_by_id(charge_id: int, db: Session, user: AuthContext):
    charge = db.query(Charge).filter(
        Charge.id == charge_id,
        Charge.deleted_at == None,
    ).first()

    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")

    _assert_charge_scope(charge, user)
    return charge


def update_charge(charge_id: int, data: UpdateChargeSchema, db: Session, user: AuthContext):
    charge = get_charge_by_id(charge_id, db, user)

    previous_amount = _to_decimal(charge.montant)

    if data.type is not None:
        charge.type = data.type
    if data.montant is not None:
        charge.montant = data.montant
    if data.categorie_charge is not None:
        charge.categorie_charge = data.categorie_charge
    if data.description is not None:
        charge.description = data.description

    new_amount = _to_decimal(charge.montant)
    delta = new_amount - previous_amount

    if charge.compte_id is not None and delta != 0:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.id == charge.compte_id,
            CompteTresorerie.deleted_at == None,
        ).first()
        if compte:
            compte.solde_actuel = _to_decimal(compte.solde_actuel) - delta

    db.commit()
    db.refresh(charge)
    emit_finance_event(
        user=user,
        event_type="finance_charge_updated",
        title="Charge mise a jour",
        message=f"Charge #{charge.id} mise a jour.",
        agence_id=charge.agence_id,
        metadata={"charge_id": int(charge.id), "agence_id": charge.agence_id, "compte_id": charge.compte_id},
    )
    if charge.agence_id is not None and charge.compte_id is not None:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.id == charge.compte_id,
            CompteTresorerie.deleted_at == None,
        ).first()
        if compte:
            _emit_low_balance_notification(user, int(charge.agence_id), compte)

    return charge


def delete_charge(charge_id: int, db: Session, user: AuthContext):
    charge = get_charge_by_id(charge_id, db, user)

    if charge.compte_id is not None:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.id == charge.compte_id,
            CompteTresorerie.deleted_at == None,
        ).first()
        if compte:
            compte.solde_actuel = _to_decimal(compte.solde_actuel) + _to_decimal(charge.montant)

    _delete_related_entretien_if_needed(charge, user)
    charge.deleted_at = datetime.utcnow()
    db.commit()
    emit_finance_event(
        user=user,
        event_type="finance_charge_deleted",
        title="Charge supprimee",
        message=f"Charge #{charge.id} supprimee.",
        agence_id=charge.agence_id,
        metadata={"charge_id": int(charge.id), "agence_id": charge.agence_id, "compte_id": charge.compte_id},
    )
    return {"message": "Charge deleted successfully"}
