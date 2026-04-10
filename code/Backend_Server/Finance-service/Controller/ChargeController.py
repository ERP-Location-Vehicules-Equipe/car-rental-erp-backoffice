import os
from datetime import datetime
from decimal import InvalidOperation
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from dependencies.FinanceDependencies import AuthContext
from Model.FinanceModels import Charge
from Schemas.FinanceSchemas import CreateChargeSchema, UpdateChargeSchema

FLEET_SERVICE_URL = os.getenv("FLEET_SERVICE_URL", "http://fleet_service:8004")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def _assert_charge_scope(charge: Charge, user: AuthContext) -> None:
    if user.is_super_admin:
        return

    if charge.agence_id is not None and user.agence_id is not None and int(charge.agence_id) != int(user.agence_id):
        raise HTTPException(status_code=403, detail="You can only access charges in your agence")


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


# ==============================
# Create Charge
# ==============================
def create_charge(data: CreateChargeSchema, db: Session, user: AuthContext):
    charge = Charge(
        type=data.type,
        vehicule_id=data.vehicule_id,
        agence_id=data.agence_id if user.is_super_admin else user.agence_id,
        categorie_charge=data.categorie_charge,
        montant=data.montant,
        date_charge=data.date_charge or datetime.utcnow(),
        description=data.description,
    )

    db.add(charge)
    db.commit()
    db.refresh(charge)

    return charge


# ==============================
# Get All Charges
# ==============================
def get_all_charges(db: Session, user: AuthContext):
    query = db.query(Charge).filter(Charge.deleted_at == None)

    if user.is_super_admin:
        return query.all()

    return query.filter(
        or_(
            Charge.agence_id == user.agence_id,
            Charge.agence_id == None,
        )
    ).all()


# ==============================
# Get Charges by Vehicule
# ==============================
def get_charges_by_vehicule(vehicule_id: int, db: Session, user: AuthContext):
    query = db.query(Charge).filter(
        Charge.vehicule_id == vehicule_id,
        Charge.deleted_at == None,
    )

    if user.is_super_admin:
        return query.all()

    return query.filter(
        or_(
            Charge.agence_id == user.agence_id,
            Charge.agence_id == None,
        )
    ).all()


# ==============================
# Get Charge by ID
# ==============================
def get_charge_by_id(charge_id: int, db: Session):
    charge = db.query(Charge).filter(
        Charge.id == charge_id,
        Charge.deleted_at == None,
    ).first()

    if not charge:
        raise HTTPException(status_code=404, detail="Charge not found")

    return charge


# ==============================
# Update Charge
# ==============================
def update_charge(charge_id: int, data: UpdateChargeSchema, db: Session, user: AuthContext):
    charge = get_charge_by_id(charge_id, db)
    _assert_charge_scope(charge, user)

    if data.type is not None:
        charge.type = data.type
    if data.montant is not None:
        charge.montant = data.montant
    if data.categorie_charge is not None:
        charge.categorie_charge = data.categorie_charge
    if data.description is not None:
        charge.description = data.description

    db.commit()
    db.refresh(charge)

    return charge


# ==============================
# Soft Delete Charge
# ==============================
def delete_charge(charge_id: int, db: Session, user: AuthContext):
    charge = get_charge_by_id(charge_id, db)
    _assert_charge_scope(charge, user)
    _delete_related_entretien_if_needed(charge, user)
    charge.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Charge deleted successfully"}
