import math
import os
import unicodedata
from datetime import datetime
import logging

import requests
from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.Model.location import Location
from app.Schemas.location_schema import (
    LocationCreate,
    LocationProlongationRequest,
    LocationRetourRequest,
    LocationStatus,
    LocationUpdate,
)
from app.dependencies.auth import AuthContext

FLEET_SERVICE_URL = os.getenv("FLEET_SERVICE_URL", "http://fleet_service:8004")
TRANSFER_SERVICE_URL = os.getenv("TRANSFER_SERVICE_URL", "http://transfer_service:8008")
FINANCE_SERVICE_URL = os.getenv("FINANCE_SERVICE_URL", "http://finance_service:8003")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
LOCATION_STATUSES = {item.value for item in LocationStatus}
BLOCKED_VEHICLE_STATUSES = {"entretien", "hors_service"}
MAINTENANCE_BLOCKING_STATUSES = {"planifiee", "en_cours"}
TRANSFER_COMPLETED_STATUS = "COMPLETED"

logger = logging.getLogger("location_service.notifications")


def _normalize_status(value: str | None) -> str:
    if not value:
        return LocationStatus.EN_COURS.value

    sanitized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = sanitized.strip().lower().replace("-", "_").replace(" ", "_")

    if normalized == "terminee":
        return LocationStatus.TERMINEE.value
    if normalized == "annulee":
        return LocationStatus.ANNULEE.value
    if normalized in {"en_cours", "encours"}:
        return LocationStatus.EN_COURS.value
    return normalized


def normalize_location_state(location: Location) -> bool:
    normalized = _normalize_status(location.etat)
    if normalized != location.etat:
        location.etat = normalized
        return True
    return False


def _to_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None
    return None


def _response_json_safe(response):
    try:
        return response.json()
    except ValueError:
        return None


def _fleet_get(path: str, token: str):
    try:
        return requests.get(
            f"{FLEET_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach fleet service",
        )


def _transfer_get(path: str, token: str):
    try:
        return requests.get(
            f"{TRANSFER_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach transfer service",
        )


def _finance_post(path: str, token: str, payload: dict):
    try:
        return requests.post(
            f"{FINANCE_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach finance service",
        )


def _notification_post(path: str, token: str, payload: dict):
    try:
        return requests.post(
            f"{NOTIFICATION_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
            timeout=8,
        )
    except requests.RequestException:
        return None


def _format_vehicle_label(vehicle_data: dict | None, vehicle_id: int) -> str:
    if not isinstance(vehicle_data, dict):
        return f"Vehicule #{vehicle_id}"
    marque = str(vehicle_data.get("marque_nom") or "").strip()
    modele = str(vehicle_data.get("modele_nom") or "").strip()
    immatriculation = str(vehicle_data.get("immatriculation") or "").strip()
    joined = " ".join(part for part in [marque, modele] if part)
    if joined and immatriculation:
        return f"{joined} ({immatriculation})"
    if joined:
        return joined
    if immatriculation:
        return immatriculation
    return f"Vehicule #{vehicle_id}"


def _emit_location_notification(
    *,
    current_user: AuthContext,
    location: Location,
    event_type: str,
    title: str,
    message: str,
    vehicle_data: dict | None = None,
) -> None:
    payload = {
        "event_type": event_type,
        "title": title,
        "message": message,
        "channels": ["popup", "email"],
        "scope": "agence",
        "agence_id": int(location.agence_depart_id),
        "action_url": f"/locations/{location.id}",
        "metadata": {
            "location_id": int(location.id),
            "client_id": int(location.client_id),
            "vehicle_id": int(location.vehicle_id),
            "vehicle_label": _format_vehicle_label(vehicle_data, int(location.vehicle_id)),
            "agence_depart_id": int(location.agence_depart_id),
            "agence_retour_id": int(location.agence_retour_id),
            "etat": str(location.etat),
            "date_debut": location.date_debut.isoformat() if location.date_debut else None,
            "date_fin_prevue": location.date_fin_prevue.isoformat() if location.date_fin_prevue else None,
            "date_retour_reelle": (
                location.date_retour_reelle.isoformat() if location.date_retour_reelle else None
            ),
            "montant_total": float(location.montant_total or 0),
        },
        "email_recipients": [current_user.email] if current_user.email else [],
    }

    response = _notification_post("/notifications/events", current_user.token, payload)
    if response is None:
        logger.warning("notification-service unreachable for event %s", event_type)
        return

    if response.status_code >= 400:
        body = _response_json_safe(response)
        logger.warning(
            "notification-service rejected event %s with status %s payload=%s",
            event_type,
            response.status_code,
            body,
        )


def _safe_vehicle_snapshot(vehicle_id: int, token: str) -> dict | None:
    try:
        return _resolve_vehicle(vehicle_id, token)
    except Exception as exc:  # pragma: no cover - resilience path
        logger.warning("Unable to resolve vehicle %s for notification: %s", vehicle_id, exc)
        return None


def _resolve_vehicle(vehicle_id: int, token: str) -> dict:
    try:
        response = _fleet_get(f"/vehicles/{vehicle_id}", token)
    except HTTPException:
        raise

    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle not found",
        )
    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to use this vehicle",
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service error",
        )
    if response.status_code >= 400:
        response_json = _response_json_safe(response) or {}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response_json.get("detail", "Invalid vehicle request"),
        )

    data = _response_json_safe(response)
    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service returned unexpected response",
        )
    return data


def _resolve_vehicle_entretiens(vehicle_id: int, token: str) -> list[dict]:
    response = _fleet_get(f"/vehicles/{vehicle_id}/entretiens", token)

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to inspect vehicle maintenance",
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service error",
        )
    if response.status_code >= 400:
        response_json = _response_json_safe(response) or {}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response_json.get("detail", "Unable to load vehicle maintenances"),
        )

    data = _response_json_safe(response)
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service returned invalid maintenance payload",
        )
    return data


def _resolve_vehicle_transfers(vehicle_id: int, token: str) -> list[dict]:
    response = _transfer_get(f"/transferts/vehicule/{vehicle_id}", token)

    if response.status_code in {401, 403}:
        return []
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Transfer service error",
        )
    if response.status_code >= 400:
        response_json = _response_json_safe(response) or {}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response_json.get("detail", "Unable to load vehicle transfers"),
        )

    data = _response_json_safe(response)
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Transfer service returned invalid payload",
        )
    return data


def _is_overlap(
    start_a: datetime,
    end_a: datetime,
    start_b: datetime,
    end_b: datetime | None,
) -> bool:
    if end_b is None:
        return start_a >= start_b or end_a > start_b
    return start_a < end_b and end_a > start_b


def _assert_vehicle_rentable_in_period(
    vehicle_data: dict,
    date_debut: datetime,
    date_fin_prevue: datetime,
    token: str,
) -> None:
    vehicle_status = (vehicle_data.get("statut") or "").strip().lower()
    if vehicle_status in BLOCKED_VEHICLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle is not rentable (status: {vehicle_status})",
        )

    vehicle_id = vehicle_data.get("id")
    if not vehicle_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle payload is missing id",
        )

    entretiens = _resolve_vehicle_entretiens(int(vehicle_id), token)
    for entretien in entretiens:
        entretien_status = str(entretien.get("statut") or "").strip().lower()
        if entretien_status not in MAINTENANCE_BLOCKING_STATUSES:
            continue

        maintenance_start = _to_datetime(entretien.get("date_debut"))
        if maintenance_start is None:
            continue
        maintenance_end = _to_datetime(entretien.get("date_fin"))

        if _is_overlap(date_debut, date_fin_prevue, maintenance_start, maintenance_end):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle is in maintenance during selected period",
            )


def _assert_vehicle_transfer_availability(
    vehicle_id: int,
    agence_depart_id: int,
    date_debut: datetime,
    token: str,
) -> None:
    transfers = _resolve_vehicle_transfers(vehicle_id, token)

    latest_arrival = None
    for transfer in transfers:
        if str(transfer.get("etat")) != TRANSFER_COMPLETED_STATUS:
            continue
        if int(transfer.get("agence_destination_id", -1)) != int(agence_depart_id):
            continue

        arrival = _to_datetime(transfer.get("date_arrivee_reelle")) or _to_datetime(
            transfer.get("date_arrivee_prevue")
        )
        if arrival is None:
            continue

        if latest_arrival is None or arrival > latest_arrival:
            latest_arrival = arrival

    if latest_arrival is None:
        return

    if date_debut.date() <= latest_arrival.date():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle can be rented only from the day after transfer arrival",
        )


def _calculate_days(date_debut: datetime, date_fin: datetime) -> int:
    duration_seconds = (date_fin - date_debut).total_seconds()
    if duration_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_fin_prevue must be after date_debut",
        )
    return max(1, math.ceil(duration_seconds / 86400))


def assert_location_scope(location: Location, current_user: AuthContext) -> None:
    if current_user.is_super_admin:
        return

    if current_user.agence_id not in {location.agence_depart_id, location.agence_retour_id}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access locations from your own agence",
        )


def _assert_create_scope(
    current_user: AuthContext,
    agence_depart_id: int,
    vehicle_agence_id: int | None,
) -> None:
    if current_user.is_super_admin:
        return

    if not (current_user.is_admin or current_user.is_employe):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin, employe or super admin access required",
        )

    if agence_depart_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agence depart must be your own agence",
        )

    if vehicle_agence_id is not None and vehicle_agence_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only use vehicles from your own agence",
        )


def _assert_admin_or_super_admin(current_user: AuthContext) -> None:
    if not (current_user.is_admin or current_user.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or super admin access required",
        )


def _assert_can_modify_location(current_user: AuthContext) -> None:
    if not (current_user.is_super_admin or current_user.is_admin or current_user.is_employe):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin, employe or super admin access required",
        )


def _check_vehicle_overlap(
    db: Session,
    vehicle_id: int,
    date_debut: datetime,
    date_fin: datetime,
    exclude_location_id: int | None = None,
) -> None:
    effective_end = func.coalesce(Location.date_retour_reelle, Location.date_fin_prevue)
    query = db.query(Location).filter(
        Location.vehicle_id == vehicle_id,
        Location.etat != LocationStatus.ANNULEE.value,
        Location.date_debut < date_fin,
        effective_end > date_debut,
    )

    if exclude_location_id is not None:
        query = query.filter(Location.id != exclude_location_id)

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle already reserved in this period",
        )


def _resolve_tarif_jour(location_tarif: float | None, vehicle_data: dict) -> float:
    vehicle_tarif = vehicle_data.get("prix_location")
    if isinstance(vehicle_tarif, (int, float)) and vehicle_tarif >= 0:
        return float(vehicle_tarif)

    if location_tarif is not None and location_tarif >= 0:
        return float(location_tarif)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unable to resolve tarif_jour for selected vehicle",
    )


def _create_location_facture(location: Location, token: str) -> None:
    payload = {
        "location_id": int(location.id),
        "montant_ht": float(location.montant_total or 0),
        "tva": 20,
    }
    response = _finance_post("/api/factures/", token, payload)
    response_json = _response_json_safe(response) or {}

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=response_json.get("detail", "Not allowed to create facture in finance service"),
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Finance service error while creating facture",
        )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response_json.get("detail", "Unable to create facture for this location"),
        )


def get_location_or_404(db: Session, location_id: int) -> Location:
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    if normalize_location_state(location):
        db.commit()
        db.refresh(location)
    return location


def get_all_locations(db: Session, current_user: AuthContext):
    query = db.query(Location)
    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Location.agence_depart_id == current_user.agence_id,
                Location.agence_retour_id == current_user.agence_id,
            )
        )

    locations = query.order_by(Location.id.desc()).all()
    should_commit = False
    for location in locations:
        should_commit = normalize_location_state(location) or should_commit

    if should_commit:
        db.commit()

    return locations


def create_location(db: Session, location_data: LocationCreate, current_user: AuthContext):
    vehicle = _resolve_vehicle(location_data.vehicle_id, current_user.token)

    agence_depart_id = location_data.agence_depart_id
    agence_retour_id = location_data.agence_retour_id
    if not current_user.is_super_admin:
        agence_depart_id = current_user.agence_id

    _assert_create_scope(
        current_user=current_user,
        agence_depart_id=agence_depart_id,
        vehicle_agence_id=vehicle.get("agence_id"),
    )

    status_value = _normalize_status(location_data.etat.value if hasattr(location_data.etat, "value") else location_data.etat)
    if status_value != LocationStatus.EN_COURS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New locations must start with en_cours status",
        )

    days = _calculate_days(location_data.date_debut, location_data.date_fin_prevue)
    _check_vehicle_overlap(
        db=db,
        vehicle_id=location_data.vehicle_id,
        date_debut=location_data.date_debut,
        date_fin=location_data.date_fin_prevue,
    )
    _assert_vehicle_rentable_in_period(
        vehicle_data=vehicle,
        date_debut=location_data.date_debut,
        date_fin_prevue=location_data.date_fin_prevue,
        token=current_user.token,
    )
    _assert_vehicle_transfer_availability(
        vehicle_id=location_data.vehicle_id,
        agence_depart_id=agence_depart_id,
        date_debut=location_data.date_debut,
        token=current_user.token,
    )
    tarif_jour = _resolve_tarif_jour(location_data.tarif_jour, vehicle)

    location = Location(
        client_id=location_data.client_id,
        vehicle_id=location_data.vehicle_id,
        agence_depart_id=agence_depart_id,
        agence_retour_id=agence_retour_id,
        date_debut=location_data.date_debut,
        date_fin_prevue=location_data.date_fin_prevue,
        date_retour_reelle=None,
        tarif_jour=tarif_jour,
        montant_total=tarif_jour * days,
        etat=status_value,
    )

    db.add(location)
    try:
        db.flush()
        _create_location_facture(location, current_user.token)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise

    db.refresh(location)
    _emit_location_notification(
        current_user=current_user,
        location=location,
        event_type="location_created",
        title="Nouvelle location creee",
        message=(
            f"Location #{location.id} creee pour {_format_vehicle_label(vehicle, int(location.vehicle_id))}. "
            f"Statut: {location.etat}."
        ),
        vehicle_data=vehicle,
    )
    return location


def update_location(
    db: Session,
    location_id: int,
    location_data: LocationUpdate,
    current_user: AuthContext,
):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)

    update_data = location_data.model_dump(exclude_unset=True)

    vehicle_id = int(update_data.get("vehicle_id", location.vehicle_id))
    agence_depart_id = int(update_data.get("agence_depart_id", location.agence_depart_id))
    agence_retour_id = int(update_data.get("agence_retour_id", location.agence_retour_id))
    date_debut = update_data.get("date_debut", location.date_debut)
    date_fin_prevue = update_data.get("date_fin_prevue", location.date_fin_prevue)
    date_retour_reelle = update_data.get("date_retour_reelle", location.date_retour_reelle)

    if date_retour_reelle is not None and date_retour_reelle < date_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_retour_reelle cannot be before date_debut",
        )

    vehicle = _resolve_vehicle(vehicle_id, current_user.token)
    _assert_can_modify_location(current_user)
    _assert_create_scope(
        current_user=current_user,
        agence_depart_id=agence_depart_id,
        vehicle_agence_id=vehicle.get("agence_id"),
    )

    _calculate_days(date_debut, date_fin_prevue)
    _check_vehicle_overlap(
        db=db,
        vehicle_id=vehicle_id,
        date_debut=date_debut,
        date_fin=date_fin_prevue,
        exclude_location_id=location.id,
    )
    _assert_vehicle_rentable_in_period(
        vehicle_data=vehicle,
        date_debut=date_debut,
        date_fin_prevue=date_fin_prevue,
        token=current_user.token,
    )
    _assert_vehicle_transfer_availability(
        vehicle_id=vehicle_id,
        agence_depart_id=agence_depart_id,
        date_debut=date_debut,
        token=current_user.token,
    )

    tarif_jour = _resolve_tarif_jour(update_data.get("tarif_jour"), vehicle)
    base_days = _calculate_days(date_debut, date_fin_prevue)
    new_total = tarif_jour * base_days

    for field, value in update_data.items():
        setattr(location, field, value)

    location.vehicle_id = vehicle_id
    location.agence_depart_id = agence_depart_id
    location.agence_retour_id = agence_retour_id
    location.tarif_jour = tarif_jour
    location.montant_total = new_total
    normalize_location_state(location)

    db.commit()
    db.refresh(location)
    _emit_location_notification(
        current_user=current_user,
        location=location,
        event_type="location_updated",
        title="Location mise a jour",
        message=(
            f"Location #{location.id} mise a jour pour "
            f"{_format_vehicle_label(vehicle, int(location.vehicle_id))}."
        ),
        vehicle_data=vehicle,
    )
    return location


def delete_location(db: Session, location_id: int, current_user: AuthContext):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)
    _assert_admin_or_super_admin(current_user)

    vehicle_data = _safe_vehicle_snapshot(location.vehicle_id, current_user.token)
    location_snapshot = {
        "id": int(location.id),
        "client_id": int(location.client_id),
        "vehicle_id": int(location.vehicle_id),
        "agence_depart_id": int(location.agence_depart_id),
        "agence_retour_id": int(location.agence_retour_id),
        "etat": str(location.etat),
        "date_debut": location.date_debut.isoformat() if location.date_debut else None,
        "date_fin_prevue": location.date_fin_prevue.isoformat() if location.date_fin_prevue else None,
    }

    db.delete(location)
    db.commit()

    dummy = Location(
        id=location_snapshot["id"],
        client_id=location_snapshot["client_id"],
        vehicle_id=location_snapshot["vehicle_id"],
        agence_depart_id=location_snapshot["agence_depart_id"],
        agence_retour_id=location_snapshot["agence_retour_id"],
        date_debut=location.date_debut,
        date_fin_prevue=location.date_fin_prevue,
        date_retour_reelle=location.date_retour_reelle,
        tarif_jour=location.tarif_jour,
        montant_total=location.montant_total,
        etat=location_snapshot["etat"],
    )
    _emit_location_notification(
        current_user=current_user,
        location=dummy,
        event_type="location_deleted",
        title="Location supprimee",
        message=(
            f"Location #{location_snapshot['id']} supprimee pour "
            f"{_format_vehicle_label(vehicle_data, location_snapshot['vehicle_id'])}."
        ),
        vehicle_data=vehicle_data,
    )


def update_location_status(
    db: Session,
    location_id: int,
    new_status: LocationStatus,
    current_user: AuthContext,
):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)

    if not (current_user.is_super_admin or current_user.is_admin or current_user.is_employe):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin, employe or super admin access required",
        )

    normalized_status = _normalize_status(new_status.value if hasattr(new_status, "value") else str(new_status))
    if normalized_status not in LOCATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status",
        )

    current_status = _normalize_status(location.etat)
    if current_status == LocationStatus.TERMINEE.value and normalized_status != LocationStatus.TERMINEE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change a terminee location status",
        )

    if normalized_status == LocationStatus.TERMINEE.value and not location.date_retour_reelle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set terminee status without a return date",
        )

    if normalized_status == LocationStatus.ANNULEE.value:
        location.date_retour_reelle = None

    location.etat = normalized_status
    db.commit()
    db.refresh(location)
    vehicle_data = _safe_vehicle_snapshot(location.vehicle_id, current_user.token)
    _emit_location_notification(
        current_user=current_user,
        location=location,
        event_type="location_status_updated",
        title="Statut de location modifie",
        message=(
            f"Location #{location.id}: statut change vers {location.etat} "
            f"({_format_vehicle_label(vehicle_data, int(location.vehicle_id))})."
        ),
        vehicle_data=vehicle_data,
    )
    return location


def process_return(
    db: Session,
    location_id: int,
    payload: LocationRetourRequest,
    current_user: AuthContext,
):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)
    _assert_admin_or_super_admin(current_user)

    current_status = _normalize_status(location.etat)
    if current_status == LocationStatus.ANNULEE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot process return for annulee location",
        )
    if current_status == LocationStatus.TERMINEE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Location already returned",
        )

    if payload.date_retour_reelle < location.date_debut:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_retour_reelle cannot be before date_debut",
        )

    delay_seconds = (payload.date_retour_reelle - location.date_fin_prevue).total_seconds()
    delay_days = math.ceil(delay_seconds / 86400) if delay_seconds > 0 else 0
    penalty = delay_days * location.tarif_jour

    location.date_retour_reelle = payload.date_retour_reelle
    location.montant_total = location.montant_total + penalty
    location.etat = LocationStatus.TERMINEE.value
    db.commit()
    db.refresh(location)
    vehicle_data = _safe_vehicle_snapshot(location.vehicle_id, current_user.token)
    _emit_location_notification(
        current_user=current_user,
        location=location,
        event_type="location_returned",
        title="Retour de location enregistre",
        message=(
            f"Location #{location.id} terminee pour "
            f"{_format_vehicle_label(vehicle_data, int(location.vehicle_id))}. "
            f"Penalite: {penalty:.2f}."
        ),
        vehicle_data=vehicle_data,
    )

    return {
        "message": "Retour processed successfully",
        "delay_days": delay_days,
        "penalty": penalty,
        "new_total": location.montant_total,
    }


def extend_location(
    db: Session,
    location_id: int,
    payload: LocationProlongationRequest,
    current_user: AuthContext,
):
    location = get_location_or_404(db, location_id)
    assert_location_scope(location, current_user)
    _assert_admin_or_super_admin(current_user)

    current_status = _normalize_status(location.etat)
    if current_status != LocationStatus.EN_COURS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only en_cours locations can be extended",
        )

    if payload.date_fin_prevue <= location.date_fin_prevue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New date_fin_prevue must be after current date_fin_prevue",
        )

    _check_vehicle_overlap(
        db=db,
        vehicle_id=location.vehicle_id,
        date_debut=location.date_debut,
        date_fin=payload.date_fin_prevue,
        exclude_location_id=location.id,
    )

    days = _calculate_days(location.date_debut, payload.date_fin_prevue)
    location.date_fin_prevue = payload.date_fin_prevue
    location.montant_total = location.tarif_jour * days

    db.commit()
    db.refresh(location)
    vehicle_data = _safe_vehicle_snapshot(location.vehicle_id, current_user.token)
    _emit_location_notification(
        current_user=current_user,
        location=location,
        event_type="location_extended",
        title="Location prolongee",
        message=(
            f"Location #{location.id} prolongee jusqu'au {location.date_fin_prevue.isoformat()} "
            f"({_format_vehicle_label(vehicle_data, int(location.vehicle_id))})."
        ),
        vehicle_data=vehicle_data,
    )

    return {
        "message": "Location extended successfully",
        "new_date_fin": location.date_fin_prevue,
        "new_total": location.montant_total,
    }


def get_stats(db: Session, current_user: AuthContext):
    query = db.query(Location)
    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Location.agence_depart_id == current_user.agence_id,
                Location.agence_retour_id == current_user.agence_id,
            )
        )

    all_locations = query.all()
    normalized_to_update: list[Location] = []
    for location in all_locations:
        if normalize_location_state(location):
            normalized_to_update.append(location)

    if normalized_to_update:
        db.commit()

    total = len(all_locations)
    en_cours = sum(1 for item in all_locations if _normalize_status(item.etat) == LocationStatus.EN_COURS.value)
    terminees = sum(1 for item in all_locations if _normalize_status(item.etat) == LocationStatus.TERMINEE.value)
    annulees = sum(1 for item in all_locations if _normalize_status(item.etat) == LocationStatus.ANNULEE.value)
    revenue = sum(float(item.montant_total or 0) for item in all_locations)

    return {
        "total": total,
        "en_cours": en_cours,
        "terminees": terminees,
        "annulees": annulees,
        "revenue": revenue,
    }
