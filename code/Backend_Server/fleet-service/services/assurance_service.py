import os
from datetime import datetime, timedelta
from typing import Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from dependencies.auth import AuthContext
from models.assurance import AssuranceStatus, VehicleAssurance
from models.vehicle import Vehicle, casablanca_now
from schemas.assurance_schema import AssuranceCreate, AssuranceUpdate

FINANCE_SERVICE_URL = os.getenv("FINANCE_SERVICE_URL", "http://finance_service:8003")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))
ASSURANCE_REMINDER_DAYS = int(os.getenv("ASSURANCE_REMINDER_DAYS", "30"))


def _response_json_safe(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
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


def get_vehicle_or_404(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehicle not found",
        )
    return vehicle


def get_assurance_by_id(db: Session, assurance_id: int):
    return db.query(VehicleAssurance).filter(VehicleAssurance.id == assurance_id).first()


def get_assurance_or_404(db: Session, assurance_id: int) -> VehicleAssurance:
    assurance = get_assurance_by_id(db, assurance_id)
    if not assurance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assurance not found",
        )
    return assurance


def validate_assurance_dates(date_debut: datetime, date_fin: datetime) -> None:
    if date_fin <= date_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_fin must be after date_debut",
        )


def assert_vehicle_in_agence(db: Session, vehicle_id: int, agence_id: int):
    vehicle = get_vehicle_or_404(db, vehicle_id)
    if vehicle.agence_id != agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage assurances in your own agence",
        )


def _assert_assurance_scope(assurance: VehicleAssurance, current_user: AuthContext) -> None:
    if current_user.is_super_admin:
        return
    if assurance.agence_id is not None and current_user.agence_id is not None:
        if int(assurance.agence_id) != int(current_user.agence_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access assurances in your own agence",
            )


def _find_matching_charge_id(assurance: VehicleAssurance, charges: list[dict]) -> int | None:
    if assurance.id is not None:
        for item in charges:
            try:
                if str(item.get("source_type") or "").strip().lower() == "assurance" and int(item.get("source_ref_id")) == int(assurance.id):
                    return int(item.get("id"))
            except (TypeError, ValueError):
                continue

    target_type = "assurance"
    target_category = str(assurance.type_assurance or "").strip().lower()
    target_amount = float(assurance.montant or 0.0)
    target_date = _parse_datetime(assurance.date_debut)

    candidates: list[tuple[float, int]] = []
    for item in charges:
        try:
            charge_id = int(item.get("id"))
        except (TypeError, ValueError):
            continue

        item_type = str(item.get("type") or "").strip().lower()
        if item_type != target_type:
            continue

        item_category = str(item.get("categorie_charge") or "").strip().lower()
        if target_category and item_category and item_category != target_category:
            continue

        try:
            item_amount = float(item.get("montant"))
        except (TypeError, ValueError):
            continue
        if abs(item_amount - target_amount) > 0.01:
            continue

        distance = 0.0
        if target_date is not None:
            item_date = _parse_datetime(item.get("date_charge"))
            if item_date is None:
                distance = 10_000_000.0
            else:
                distance = abs((item_date - target_date).total_seconds())
        candidates.append((distance, charge_id))

    if not candidates:
        return None

    candidates.sort(key=lambda pair: (pair[0], -pair[1]))
    return candidates[0][1]


def _delete_related_finance_charge_if_needed(assurance: VehicleAssurance, finance_token: str | None) -> None:
    if not finance_token:
        return
    if assurance.vehicle_id is None:
        return

    headers = {"Authorization": f"Bearer {finance_token}"}
    try:
        response = httpx.get(
            f"{FINANCE_SERVICE_URL.rstrip('/')}/api/charges/vehicule/{int(assurance.vehicle_id)}",
            headers=headers,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Unable to reach finance service for assurance sync")

    payload = _response_json_safe(response) or {}
    if response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Not allowed to sync assurance charge deletion")
    if response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Finance service error while syncing assurance charge deletion")
    if response.status_code >= 400:
        detail = payload.get("detail", "Unable to load charges from finance service")
        raise HTTPException(status_code=400, detail=detail)

    charges = payload.get("charges") if isinstance(payload, dict) else None
    if not isinstance(charges, list):
        return

    charge_id = _find_matching_charge_id(assurance, charges)
    if not charge_id:
        return

    try:
        delete_response = httpx.delete(
            f"{FINANCE_SERVICE_URL.rstrip('/')}/api/charges/{charge_id}",
            headers=headers,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Unable to reach finance service for charge deletion")

    if delete_response.status_code in {200, 204, 404}:
        return
    if delete_response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Not allowed to delete related assurance charge")
    if delete_response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Finance service error while deleting assurance charge")
    if delete_response.status_code >= 400:
        detail = (_response_json_safe(delete_response) or {}).get("detail", "Unable to delete related assurance charge")
        raise HTTPException(status_code=400, detail=detail)


def _create_finance_charge_for_assurance(
    assurance: VehicleAssurance,
    vehicle: Vehicle,
    finance_token: str,
) -> None:
    description = f"Assurance {assurance.type_assurance}: {assurance.assureur} ({assurance.numero_police})"
    payload = {
        "type": "assurance",
        "vehicule_id": int(vehicle.id),
        "agence_id": int(vehicle.agence_id) if vehicle.agence_id is not None else None,
        "source_type": "assurance",
        "source_ref_id": int(assurance.id),
        "categorie_charge": str(assurance.type_assurance),
        "montant": float(assurance.montant),
        "date_charge": assurance.date_debut.isoformat(),
        "description": description,
    }
    try:
        response = httpx.post(
            f"{FINANCE_SERVICE_URL.rstrip('/')}/api/charges/",
            headers={"Authorization": f"Bearer {finance_token}"},
            json=payload,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach finance service for assurance charge creation",
        )

    response_json = _response_json_safe(response) or {}
    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=response_json.get("detail", "Not allowed to create assurance charge in finance service"),
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Finance service error while creating assurance charge",
        )
    if response.status_code >= 400:
        detail = response_json.get("detail", "Unable to create assurance charge in finance service")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _emit_assurance_expiry_notification(
    assurance: VehicleAssurance,
    vehicle: Vehicle | None,
    current_user: AuthContext,
    remaining_days: int,
) -> bool:
    if not current_user.token:
        return False

    vehicle_label = vehicle.immatriculation if vehicle else f"#{assurance.vehicle_id}"
    if vehicle and vehicle.immatriculation:
        vehicle_label = vehicle.immatriculation

    payload = {
        "event_type": "assurance_expiring",
        "title": "Assurance proche expiration",
        "message": (
            f"Assurance du vehicule {vehicle_label} expire dans {remaining_days} jour(s) "
            f"(echeance: {assurance.date_fin.strftime('%d/%m/%Y')})."
        ),
        "channels": ["popup", "email"],
        "scope": "agence",
        "agence_id": int(assurance.agence_id) if assurance.agence_id is not None else None,
        "action_url": "/fleet",
        "metadata": {
            "assurance_id": int(assurance.id),
            "vehicle_id": int(assurance.vehicle_id),
            "vehicle_immatriculation": vehicle.immatriculation if vehicle else None,
            "date_fin": assurance.date_fin.isoformat() if assurance.date_fin else None,
            "remaining_days": int(remaining_days),
            "type_assurance": assurance.type_assurance,
        },
        "user_email": current_user.email,
    }

    try:
        response = httpx.post(
            f"{NOTIFICATION_SERVICE_URL.rstrip('/')}/notifications/events",
            headers={"Authorization": f"Bearer {current_user.token}"},
            json=payload,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        return False

    return response.status_code < 400


def _emit_assurance_action_notification(
    *,
    assurance: VehicleAssurance,
    vehicle: Vehicle | None,
    current_user: AuthContext,
    event_type: str,
    title: str,
    message: str,
) -> bool:
    if not current_user.token:
        return False

    payload = {
        "event_type": event_type,
        "title": title,
        "message": message,
        "channels": ["popup", "email"],
        "scope": "agence",
        "agence_id": int(assurance.agence_id) if assurance.agence_id is not None else None,
        "action_url": "/fleet",
        "metadata": {
            "assurance_id": int(assurance.id) if assurance.id is not None else None,
            "vehicle_id": int(assurance.vehicle_id) if assurance.vehicle_id is not None else None,
            "vehicle_immatriculation": vehicle.immatriculation if vehicle else None,
            "type_assurance": assurance.type_assurance,
            "statut": assurance.statut,
            "date_fin": assurance.date_fin.isoformat() if assurance.date_fin else None,
        },
        "user_email": current_user.email,
        "email_recipients": [current_user.email] if current_user.email else [],
    }

    try:
        response = httpx.post(
            f"{NOTIFICATION_SERVICE_URL.rstrip('/')}/notifications/events",
            headers={"Authorization": f"Bearer {current_user.token}"},
            json=payload,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        return False

    return response.status_code < 400


def _maybe_send_assurance_reminder(
    assurance: VehicleAssurance,
    vehicle: Vehicle | None,
    current_user: AuthContext,
    reminder_days: int = ASSURANCE_REMINDER_DAYS,
) -> bool:
    if assurance.statut in {AssuranceStatus.ANNULEE.value, AssuranceStatus.EXPIREE.value}:
        return False

    now = casablanca_now()
    date_fin = _parse_datetime(assurance.date_fin)
    if date_fin is None:
        return False

    if date_fin < now:
        assurance.statut = AssuranceStatus.EXPIREE.value
        return False

    if assurance.reminder_sent_at is not None:
        return False

    remaining_days = (date_fin.date() - now.date()).days
    if remaining_days > reminder_days:
        return False

    notified = _emit_assurance_expiry_notification(assurance, vehicle, current_user, remaining_days)
    if notified:
        assurance.reminder_sent_at = now
        return True
    return False


def get_all_assurances(db: Session, agence_id: int | None = None):
    query = db.query(VehicleAssurance)
    if agence_id is not None:
        query = query.filter(VehicleAssurance.agence_id == agence_id)
    return query.order_by(VehicleAssurance.date_fin.asc(), VehicleAssurance.id.desc()).all()


def get_vehicle_assurances(db: Session, vehicle_id: int, agence_id: int | None = None):
    query = db.query(VehicleAssurance).filter(VehicleAssurance.vehicle_id == vehicle_id)
    if agence_id is not None:
        query = query.filter(VehicleAssurance.agence_id == agence_id)
    return query.order_by(VehicleAssurance.date_fin.asc(), VehicleAssurance.id.desc()).all()


def create_assurance(
    db: Session,
    assurance_data: AssuranceCreate,
    current_user: AuthContext,
    finance_token: str | None = None,
):
    vehicle = get_vehicle_or_404(db, assurance_data.vehicle_id)
    if not current_user.is_super_admin:
        assert_vehicle_in_agence(db, assurance_data.vehicle_id, current_user.agence_id)

    date_debut = _parse_datetime(assurance_data.date_debut)
    date_fin = _parse_datetime(assurance_data.date_fin)
    if date_debut is None or date_fin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assurance dates")
    validate_assurance_dates(date_debut, date_fin)

    assurance = VehicleAssurance(
        vehicle_id=assurance_data.vehicle_id,
        agence_id=vehicle.agence_id,
        type_assurance=str(assurance_data.type_assurance),
        assureur=assurance_data.assureur,
        numero_police=assurance_data.numero_police,
        date_debut=date_debut,
        date_fin=date_fin,
        montant=assurance_data.montant,
        statut=str(assurance_data.statut),
        notes=assurance_data.notes,
    )

    db.add(assurance)
    try:
        db.flush()
        if finance_token:
            _create_finance_charge_for_assurance(assurance, vehicle, finance_token)
        _maybe_send_assurance_reminder(assurance, vehicle, current_user)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(assurance)
    _emit_assurance_action_notification(
        assurance=assurance,
        vehicle=vehicle,
        current_user=current_user,
        event_type="assurance_created",
        title="Assurance creee",
        message=(
            f"Assurance {assurance.type_assurance} creee pour le vehicule "
            f"{vehicle.immatriculation or assurance.vehicle_id}."
        ),
    )
    return assurance


def update_assurance(
    db: Session,
    assurance_id: int,
    assurance_data: AssuranceUpdate,
    current_user: AuthContext,
):
    assurance = get_assurance_or_404(db, assurance_id)
    _assert_assurance_scope(assurance, current_user)

    update_data = assurance_data.model_dump(exclude_unset=True)
    target_vehicle_id = int(update_data.get("vehicle_id", assurance.vehicle_id))

    vehicle = get_vehicle_or_404(db, target_vehicle_id)
    if not current_user.is_super_admin:
        assert_vehicle_in_agence(db, target_vehicle_id, current_user.agence_id)

    date_debut = _parse_datetime(update_data.get("date_debut", assurance.date_debut))
    date_fin = _parse_datetime(update_data.get("date_fin", assurance.date_fin))
    if date_debut is None or date_fin is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid assurance dates")
    validate_assurance_dates(date_debut, date_fin)

    update_data["date_debut"] = date_debut
    update_data["date_fin"] = date_fin

    reset_reminder_fields = {"date_fin", "date_debut", "statut"}
    if any(field in update_data for field in reset_reminder_fields):
        assurance.reminder_sent_at = None

    for field, value in update_data.items():
        if field in {"type_assurance", "statut"} and value is not None:
            setattr(assurance, field, str(value))
        else:
            setattr(assurance, field, value)

    assurance.agence_id = vehicle.agence_id
    _maybe_send_assurance_reminder(assurance, vehicle, current_user)

    db.commit()
    db.refresh(assurance)
    _emit_assurance_action_notification(
        assurance=assurance,
        vehicle=vehicle,
        current_user=current_user,
        event_type="assurance_updated",
        title="Assurance mise a jour",
        message=(
            f"Assurance #{assurance.id} mise a jour pour le vehicule "
            f"{vehicle.immatriculation or assurance.vehicle_id}."
        ),
    )
    return assurance


def delete_assurance(
    db: Session,
    assurance_id: int,
    current_user: AuthContext,
    finance_token: str | None = None,
):
    assurance = get_assurance_or_404(db, assurance_id)
    _assert_assurance_scope(assurance, current_user)
    vehicle = db.query(Vehicle).filter(Vehicle.id == assurance.vehicle_id).first()

    _delete_related_finance_charge_if_needed(assurance, finance_token)
    _emit_assurance_action_notification(
        assurance=assurance,
        vehicle=vehicle,
        current_user=current_user,
        event_type="assurance_deleted",
        title="Assurance supprimee",
        message=(
            f"Assurance #{assurance.id} supprimee pour le vehicule "
            f"{(vehicle.immatriculation if vehicle else assurance.vehicle_id)}."
        ),
    )
    db.delete(assurance)
    db.commit()


def trigger_assurance_reminders(
    db: Session,
    current_user: AuthContext,
    agence_id: int | None = None,
) -> dict:
    query = db.query(VehicleAssurance)
    if agence_id is not None:
        query = query.filter(VehicleAssurance.agence_id == agence_id)

    assurances = query.all()
    sent_count = 0
    updated_status_count = 0

    for assurance in assurances:
        vehicle = db.query(Vehicle).filter(Vehicle.id == assurance.vehicle_id).first()
        previous_status = assurance.statut
        if _maybe_send_assurance_reminder(assurance, vehicle, current_user):
            sent_count += 1
        if previous_status != assurance.statut:
            updated_status_count += 1

    if sent_count or updated_status_count:
        db.commit()

    return {
        "checked": len(assurances),
        "sent": sent_count,
        "status_updates": updated_status_count,
    }
