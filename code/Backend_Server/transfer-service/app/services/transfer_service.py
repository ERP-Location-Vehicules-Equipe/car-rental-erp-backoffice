import os
from datetime import datetime, timedelta, timezone
import logging

import requests
from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.transfer import Transfer
from app.schemas.transfer import (
    CreateTransferRequest,
    TransferAvailabilityResponse,
    UpdateTransferRequest,
    UpdateTransferStatusRequest,
)
from app.utils.auth import AuthContext
from app.utils.enums import TransferStatus

FLEET_SERVICE_URL = os.getenv("FLEET_SERVICE_URL", "http://fleet_service:8004")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
ACTIVE_TRANSFER_STATUSES = {TransferStatus.PENDING.value, TransferStatus.IN_TRANSIT.value}
FINAL_TRANSFER_STATUSES = {TransferStatus.COMPLETED.value, TransferStatus.CANCELLED.value}

logger = logging.getLogger("transfer_service.notifications")


def _to_naive_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _now_utc_naive() -> datetime:
    return datetime.utcnow()


def _response_json_safe(response: requests.Response):
    try:
        return response.json()
    except ValueError:
        return None


def _fleet_get(path: str, token: str, params: dict | None = None):
    try:
        return requests.get(
            f"{FLEET_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach fleet service",
        )


def _fleet_put(path: str, token: str, payload: dict):
    try:
        return requests.put(
            f"{FLEET_SERVICE_URL.rstrip('/')}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=payload,
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach fleet service",
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


def _emit_transfer_notification(
    *,
    transfer: Transfer,
    current_user: AuthContext,
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
        "agence_id": int(transfer.agence_destination_id),
        "action_url": f"/transferts/{transfer.id}",
        "metadata": {
            "transfer_id": int(transfer.id),
            "vehicule_id": int(transfer.vehicule_id),
            "vehicule_label": _format_vehicle_label(vehicle_data, int(transfer.vehicule_id)),
            "agence_source_id": int(transfer.agence_source_id),
            "agence_destination_id": int(transfer.agence_destination_id),
            "etat": str(transfer.etat),
            "date_depart": transfer.date_depart.isoformat() if transfer.date_depart else None,
            "date_arrivee_prevue": (
                transfer.date_arrivee_prevue.isoformat() if transfer.date_arrivee_prevue else None
            ),
            "date_arrivee_reelle": (
                transfer.date_arrivee_reelle.isoformat() if transfer.date_arrivee_reelle else None
            ),
            "reason": transfer.reason,
            "notes": transfer.notes,
        },
        "email_recipients": [current_user.email] if current_user.email else [],
    }

    response = _notification_post("/notifications/events", current_user.token, payload)
    if response is None:
        logger.warning("notification-service unreachable for transfer event %s", event_type)
        return

    if response.status_code >= 400:
        body = _response_json_safe(response)
        logger.warning(
            "notification-service rejected transfer event %s with status %s payload=%s",
            event_type,
            response.status_code,
            body,
        )


def _safe_vehicle_snapshot(token: str, vehicle_id: int) -> dict | None:
    try:
        response = _fleet_get(f"/vehicles/{vehicle_id}", token)
    except HTTPException as exc:
        logger.warning("Unable to resolve vehicle %s for transfer notification: %s", vehicle_id, exc)
        return None

    if response.status_code >= 400:
        return None
    data = _response_json_safe(response)
    if isinstance(data, dict):
        return data
    return None


def _assert_admin_or_super_admin(current_user: AuthContext) -> None:
    if not (current_user.is_admin or current_user.is_super_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or super admin access required",
        )


def _assert_transfer_scope(transfer: Transfer, current_user: AuthContext) -> None:
    if current_user.is_super_admin:
        return

    if current_user.agence_id not in {transfer.agence_source_id, transfer.agence_destination_id}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access transfers from your agence scope",
        )


def _assert_create_scope(
    current_user: AuthContext,
    agence_source_id: int,
    agence_destination_id: int,
) -> None:
    if agence_source_id == agence_destination_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination agencies must be different",
        )

    if current_user.is_super_admin:
        return

    if current_user.agence_id not in {agence_source_id, agence_destination_id}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Transfer must involve your agence",
        )

    if current_user.is_employe and agence_destination_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employe can only request transfers to their own agence",
        )


def _assert_source_admin_or_super_admin(transfer: Transfer, current_user: AuthContext) -> None:
    _assert_admin_or_super_admin(current_user)
    if current_user.is_super_admin:
        return
    if transfer.agence_source_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only source agence admin can manage transfer workflow",
        )


def _assert_source_workflow_access(transfer: Transfer, current_user: AuthContext) -> None:
    if current_user.is_super_admin:
        return

    if not (current_user.is_admin or current_user.is_employe):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin, employe or super admin access required",
        )

    if transfer.agence_source_id != current_user.agence_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only source agence users can update transfer status",
        )


def _fetch_transfer_catalog(
    current_user: AuthContext,
    source_agence_id: int | None = None,
    include_my_agence: bool = False,
) -> list[dict]:
    params: dict[str, int] = {}
    if source_agence_id is not None:
        params["source_agence_id"] = source_agence_id
    if not current_user.is_super_admin and not include_my_agence and current_user.agence_id:
        params["exclude_agence_id"] = current_user.agence_id

    response = _fleet_get("/vehicles/available-transfer", current_user.token, params=params)

    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to inspect transfer availability",
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
            detail=response_json.get("detail", "Unable to load vehicle availability"),
        )

    data = _response_json_safe(response)
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet availability response is invalid",
        )
    return data


def _find_vehicle_candidate(
    current_user: AuthContext,
    vehicule_id: int,
    agence_source_id: int,
) -> dict:
    catalog = _fetch_transfer_catalog(
        current_user=current_user,
        source_agence_id=agence_source_id,
        include_my_agence=True,
    )

    for item in catalog:
        if int(item.get("id", -1)) == vehicule_id:
            return item

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Vehicle not available for transfer from selected source agence",
    )


def _sync_vehicle_for_in_transit(transfer: Transfer, token: str) -> None:
    response = _fleet_put(
        f"/vehicles/{transfer.vehicule_id}",
        token,
        {"statut": "hors_service"},
    )
    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to lock vehicle for transfer",
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service error while locking vehicle",
        )
    if response.status_code >= 400:
        payload = _response_json_safe(response) or {}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=payload.get("detail", "Unable to lock vehicle for transfer"),
        )


def _sync_vehicle_for_completed_transfer(transfer: Transfer, token: str) -> None:
    response = _fleet_put(
        f"/vehicles/{transfer.vehicule_id}",
        token,
        {
            "agence_id": transfer.agence_destination_id,
            "statut": "disponible",
        },
    )
    if response.status_code in {401, 403}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to finalize vehicle transfer in fleet",
        )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service error while finalizing transfer",
        )
    if response.status_code >= 400:
        payload = _response_json_safe(response) or {}
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=payload.get("detail", "Unable to finalize transfer in fleet"),
        )


def _sync_vehicle_for_cancelled_transfer(transfer: Transfer, token: str) -> None:
    response = _fleet_put(
        f"/vehicles/{transfer.vehicule_id}",
        token,
        {
            "agence_id": transfer.agence_source_id,
            "statut": "disponible",
        },
    )
    if response.status_code >= 500:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Fleet service error while cancelling transfer",
        )


def get_transfer_or_404(db: Session, transfer_id: int) -> Transfer:
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found",
        )
    return transfer


def get_transfer_candidates(
    db: Session,
    current_user: AuthContext,
    source_agence_id: int | None = None,
    include_my_agence: bool = False,
) -> TransferAvailabilityResponse:
    vehicles = _fetch_transfer_catalog(
        current_user=current_user,
        source_agence_id=source_agence_id,
        include_my_agence=include_my_agence,
    )

    active_vehicle_ids = {
        row[0]
        for row in db.query(Transfer.vehicule_id)
        .filter(Transfer.etat.in_(list(ACTIVE_TRANSFER_STATUSES)))
        .all()
    }

    filtered = [
        vehicle
        for vehicle in vehicles
        if int(vehicle.get("id", -1)) not in active_vehicle_ids
    ]

    return TransferAvailabilityResponse(
        total=len(filtered),
        vehicles=filtered,
    )


def create_transfer(
    db: Session,
    request: CreateTransferRequest,
    current_user: AuthContext,
) -> Transfer:
    _assert_create_scope(
        current_user,
        agence_source_id=request.agence_source_id,
        agence_destination_id=request.agence_destination_id,
    )

    vehicle = _find_vehicle_candidate(
        current_user=current_user,
        vehicule_id=request.vehicule_id,
        agence_source_id=request.agence_source_id,
    )
    if int(vehicle.get("agence_id")) != request.agence_source_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle does not belong to selected source agence",
        )

    existing_active_transfer = (
        db.query(Transfer)
        .filter(
            Transfer.vehicule_id == request.vehicule_id,
            Transfer.etat.in_(list(ACTIVE_TRANSFER_STATUSES)),
        )
        .first()
    )
    if existing_active_transfer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle already has an active transfer",
        )

    date_depart = _to_naive_utc(request.date_depart) or _now_utc_naive()
    date_arrivee_prevue = _to_naive_utc(request.date_arrivee_prevue) or (date_depart + timedelta(days=1))
    if date_arrivee_prevue <= date_depart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_arrivee_prevue must be after date_depart",
        )

    transfer = Transfer(
        vehicule_id=request.vehicule_id,
        agence_source_id=request.agence_source_id,
        agence_destination_id=request.agence_destination_id,
        etat=TransferStatus.PENDING.value,
        date_depart=date_depart,
        date_arrivee_prevue=date_arrivee_prevue,
        reason=request.reason,
        notes=request.notes,
        created_by=current_user.email or f"user#{current_user.user_id}",
    )

    db.add(transfer)
    db.commit()
    db.refresh(transfer)
    vehicle_data = _safe_vehicle_snapshot(current_user.token, int(transfer.vehicule_id))
    _emit_transfer_notification(
        transfer=transfer,
        current_user=current_user,
        event_type="transfer_created",
        title="Demande de transfert creee",
        message=(
            f"Transfert #{transfer.id} cree pour "
            f"{_format_vehicle_label(vehicle_data, int(transfer.vehicule_id))}."
        ),
        vehicle_data=vehicle_data,
    )
    return transfer


def get_all_transfers(db: Session, current_user: AuthContext):
    query = db.query(Transfer)
    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Transfer.agence_source_id == current_user.agence_id,
                Transfer.agence_destination_id == current_user.agence_id,
            )
        )
    return query.order_by(Transfer.id.desc()).all()


def get_transfer_by_id(db: Session, transfer_id: int, current_user: AuthContext):
    transfer = get_transfer_or_404(db, transfer_id)
    _assert_transfer_scope(transfer, current_user)
    return transfer


def get_transfers_by_vehicle(db: Session, vehicule_id: int, current_user: AuthContext):
    query = db.query(Transfer).filter(Transfer.vehicule_id == vehicule_id)
    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Transfer.agence_source_id == current_user.agence_id,
                Transfer.agence_destination_id == current_user.agence_id,
            )
        )
    return query.order_by(Transfer.id.desc()).all()


def update_transfer(
    db: Session,
    transfer_id: int,
    request: UpdateTransferRequest,
    current_user: AuthContext,
):
    transfer = get_transfer_or_404(db, transfer_id)
    _assert_transfer_scope(transfer, current_user)
    _assert_source_admin_or_super_admin(transfer, current_user)

    if transfer.etat in FINAL_TRANSFER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalized transfer cannot be updated",
        )

    update_data = request.model_dump(exclude_unset=True)
    current_vehicle_id = int(transfer.vehicule_id)
    current_source_agence_id = int(transfer.agence_source_id)
    current_destination_agence_id = int(transfer.agence_destination_id)

    next_vehicle_id = int(update_data.get("vehicule_id", current_vehicle_id))
    next_source_agence_id = int(update_data.get("agence_source_id", current_source_agence_id))
    next_destination_agence_id = int(
        update_data.get("agence_destination_id", current_destination_agence_id)
    )

    if ("vehicule_id" in update_data or "agence_source_id" in update_data) and not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can change source agence or vehicle",
        )

    _assert_create_scope(
        current_user=current_user,
        agence_source_id=next_source_agence_id,
        agence_destination_id=next_destination_agence_id,
    )

    if next_vehicle_id != current_vehicle_id or next_source_agence_id != current_source_agence_id:
        vehicle = _find_vehicle_candidate(
            current_user=current_user,
            vehicule_id=next_vehicle_id,
            agence_source_id=next_source_agence_id,
        )
        if int(vehicle.get("agence_id")) != next_source_agence_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle does not belong to selected source agence",
            )

        existing_active_transfer = (
            db.query(Transfer)
            .filter(
                Transfer.id != transfer.id,
                Transfer.vehicule_id == next_vehicle_id,
                Transfer.etat.in_(list(ACTIVE_TRANSFER_STATUSES)),
            )
            .first()
        )
        if existing_active_transfer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle already has an active transfer",
            )

    if "agence_destination_id" in update_data:
        if next_destination_agence_id == next_source_agence_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and destination agencies must be different",
            )
        transfer.agence_destination_id = next_destination_agence_id

    if "agence_source_id" in update_data:
        transfer.agence_source_id = next_source_agence_id

    if "vehicule_id" in update_data:
        transfer.vehicule_id = next_vehicle_id

    if "date_depart" in update_data:
        transfer.date_depart = _to_naive_utc(update_data["date_depart"])
    if "date_arrivee_prevue" in update_data:
        transfer.date_arrivee_prevue = _to_naive_utc(update_data["date_arrivee_prevue"])
    if "reason" in update_data:
        transfer.reason = str(update_data["reason"])
    if "notes" in update_data:
        transfer.notes = update_data["notes"]

    if transfer.date_depart and transfer.date_arrivee_prevue:
        if transfer.date_arrivee_prevue <= transfer.date_depart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_arrivee_prevue must be after date_depart",
            )

    db.commit()
    db.refresh(transfer)
    vehicle_data = _safe_vehicle_snapshot(current_user.token, int(transfer.vehicule_id))
    _emit_transfer_notification(
        transfer=transfer,
        current_user=current_user,
        event_type="transfer_updated",
        title="Transfert modifie",
        message=(
            f"Transfert #{transfer.id} mis a jour pour "
            f"{_format_vehicle_label(vehicle_data, int(transfer.vehicule_id))}."
        ),
        vehicle_data=vehicle_data,
    )
    return transfer


def update_transfer_status(
    db: Session,
    transfer_id: int,
    request: UpdateTransferStatusRequest,
    current_user: AuthContext,
):
    transfer = get_transfer_or_404(db, transfer_id)
    _assert_transfer_scope(transfer, current_user)
    _assert_source_workflow_access(transfer, current_user)

    current_status = transfer.etat
    target_status = request.etat.value

    if current_status in FINAL_TRANSFER_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Finalized transfer cannot be updated",
        )

    allowed_transitions = {
        TransferStatus.PENDING.value: {TransferStatus.IN_TRANSIT.value, TransferStatus.CANCELLED.value},
        TransferStatus.IN_TRANSIT.value: {TransferStatus.COMPLETED.value, TransferStatus.CANCELLED.value},
    }

    if target_status != current_status and target_status not in allowed_transitions.get(current_status, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transition from {current_status} to {target_status}",
        )

    if current_user.is_employe and target_status == TransferStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employe cannot cancel transfer workflow",
        )

    if request.notes is not None:
        transfer.notes = request.notes

    if target_status == TransferStatus.IN_TRANSIT.value:
        date_depart = _to_naive_utc(request.date_depart) or transfer.date_depart or _now_utc_naive()
        date_arrivee_prevue = (
            _to_naive_utc(request.date_arrivee_prevue)
            or transfer.date_arrivee_prevue
            or (date_depart + timedelta(days=1))
        )
        if date_arrivee_prevue <= date_depart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_arrivee_prevue must be after date_depart",
            )
        transfer.date_depart = date_depart
        transfer.date_arrivee_prevue = date_arrivee_prevue
        transfer.etat = target_status
        _sync_vehicle_for_in_transit(transfer, current_user.token)

    elif target_status == TransferStatus.COMPLETED.value:
        date_arrivee_reelle = _to_naive_utc(request.date_arrivee_reelle) or _now_utc_naive()
        date_depart = transfer.date_depart or _now_utc_naive()
        if date_arrivee_reelle <= date_depart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date_arrivee_reelle must be after date_depart",
            )
        transfer.date_arrivee_reelle = date_arrivee_reelle
        transfer.etat = target_status
        _sync_vehicle_for_completed_transfer(transfer, current_user.token)

    elif target_status == TransferStatus.CANCELLED.value:
        transfer.etat = target_status
        _sync_vehicle_for_cancelled_transfer(transfer, current_user.token)

    db.commit()
    db.refresh(transfer)
    vehicle_data = _safe_vehicle_snapshot(current_user.token, int(transfer.vehicule_id))
    _emit_transfer_notification(
        transfer=transfer,
        current_user=current_user,
        event_type="transfer_status_updated",
        title="Statut de transfert modifie",
        message=(
            f"Transfert #{transfer.id} passe a {transfer.etat} pour "
            f"{_format_vehicle_label(vehicle_data, int(transfer.vehicule_id))}."
        ),
        vehicle_data=vehicle_data,
    )
    return transfer


def cancel_transfer(
    db: Session,
    transfer_id: int,
    current_user: AuthContext,
):
    transfer = get_transfer_or_404(db, transfer_id)
    _assert_transfer_scope(transfer, current_user)
    _assert_source_admin_or_super_admin(transfer, current_user)

    if transfer.etat == TransferStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed transfer cannot be cancelled",
        )
    if transfer.etat == TransferStatus.CANCELLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transfer already cancelled",
        )

    previous_status = transfer.etat
    transfer.etat = TransferStatus.CANCELLED.value
    if previous_status == TransferStatus.IN_TRANSIT.value:
        _sync_vehicle_for_cancelled_transfer(transfer, current_user.token)

    db.commit()
    db.refresh(transfer)
    vehicle_data = _safe_vehicle_snapshot(current_user.token, int(transfer.vehicule_id))
    _emit_transfer_notification(
        transfer=transfer,
        current_user=current_user,
        event_type="transfer_cancelled",
        title="Transfert annule",
        message=(
            f"Transfert #{transfer.id} annule pour "
            f"{_format_vehicle_label(vehicle_data, int(transfer.vehicule_id))}."
        ),
        vehicle_data=vehicle_data,
    )
    return transfer


def delete_transfer(
    db: Session,
    transfer_id: int,
    current_user: AuthContext,
) -> None:
    transfer = get_transfer_or_404(db, transfer_id)
    _assert_transfer_scope(transfer, current_user)
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admin can delete transfers",
        )

    vehicle_data = _safe_vehicle_snapshot(current_user.token, int(transfer.vehicule_id))
    transfer_snapshot = {
        "id": int(transfer.id),
        "vehicule_id": int(transfer.vehicule_id),
        "agence_source_id": int(transfer.agence_source_id),
        "agence_destination_id": int(transfer.agence_destination_id),
        "etat": str(transfer.etat),
        "date_depart": transfer.date_depart,
        "date_arrivee_prevue": transfer.date_arrivee_prevue,
        "date_arrivee_reelle": transfer.date_arrivee_reelle,
        "reason": transfer.reason,
        "notes": transfer.notes,
    }

    db.delete(transfer)
    db.commit()

    ghost = Transfer(
        id=transfer_snapshot["id"],
        vehicule_id=transfer_snapshot["vehicule_id"],
        agence_source_id=transfer_snapshot["agence_source_id"],
        agence_destination_id=transfer_snapshot["agence_destination_id"],
        etat=transfer_snapshot["etat"],
        date_depart=transfer_snapshot["date_depart"],
        date_arrivee_prevue=transfer_snapshot["date_arrivee_prevue"],
        date_arrivee_reelle=transfer_snapshot["date_arrivee_reelle"],
        reason=transfer_snapshot["reason"],
        notes=transfer_snapshot["notes"],
        created_by=current_user.email or f"user#{current_user.user_id}",
    )

    _emit_transfer_notification(
        transfer=ghost,
        current_user=current_user,
        event_type="transfer_deleted",
        title="Transfert supprime",
        message=(
            f"Transfert #{transfer_snapshot['id']} supprime pour "
            f"{_format_vehicle_label(vehicle_data, transfer_snapshot['vehicule_id'])}."
        ),
        vehicle_data=vehicle_data,
    )
