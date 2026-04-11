import os
import re
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.notification import Notification, NotificationRead
from app.schemas.notification import NotificationEventCreate, NotificationItemResponse
from app.services.email.email_service import send_email


SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "saidouchrif16@gmail.com")
AGENCE_SERVICE_URL = os.getenv("AGENCE_SERVICE_URL", "http://agence_service:8002/api/agences")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def _normalize_channels(channels_raw: str) -> list[str]:
    values = [item.strip() for item in (channels_raw or "").split(",") if item.strip()]
    return values or ["popup"]


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _prettify_event_type(event_type: str) -> str:
    normalized = str(event_type or "").strip().lower()
    mapping = {
        "finance_charge_created": "Charge creee",
        "finance_charge_updated": "Charge mise a jour",
        "finance_charge_deleted": "Charge supprimee",
        "finance_compte_created": "Compte cree",
        "finance_compte_updated": "Compte mis a jour",
        "finance_compte_deleted": "Compte supprime",
        "finance_facture_created": "Facture creee",
        "finance_facture_updated": "Facture mise a jour",
        "finance_facture_deleted": "Facture supprimee",
        "finance_facture_restored": "Facture restauree",
        "finance_paiement_created": "Paiement enregistre",
        "finance_paiement_deleted": "Paiement supprime",
        "finance_compte_overdraft": "Alerte compte agence",
        "location_created": "Location creee",
        "location_updated": "Location mise a jour",
        "location_returned": "Vehicule retourne",
        "location_status_updated": "Statut location modifie",
        "location_prolonged": "Location prolongee",
        "location_extended": "Location prolongee",
        "transfer_created": "Demande de transfert",
        "transfer_updated": "Transfert mis a jour",
        "transfer_status_updated": "Statut transfert modifie",
        "transfer_cancelled": "Transfert annule",
        "transfer_deleted": "Transfert supprime",
        "assurance_created": "Assurance creee",
        "assurance_updated": "Assurance mise a jour",
        "assurance_deleted": "Assurance supprimee",
        "assurance_expiring": "Assurance proche expiration",
        "fleet_vehicle_created": "Vehicule ajoute",
        "fleet_vehicle_updated": "Vehicule mis a jour",
        "fleet_vehicle_status_updated": "Statut vehicule modifie",
        "fleet_vehicle_deleted": "Vehicule supprime",
        "fleet_entretien_created": "Entretien ajoute",
        "fleet_entretien_updated": "Entretien mis a jour",
        "fleet_entretien_deleted": "Entretien supprime",
        "fleet_categorie_created": "Categorie creee",
        "fleet_categorie_updated": "Categorie mise a jour",
        "fleet_categorie_deleted": "Categorie supprimee",
        "fleet_marque_created": "Marque creee",
        "fleet_marque_updated": "Marque mise a jour",
        "fleet_marque_deleted": "Marque supprimee",
        "fleet_modele_created": "Modele cree",
        "fleet_modele_updated": "Modele mis a jour",
        "fleet_modele_deleted": "Modele supprime",
        "gateway_post": "Action creation",
        "gateway_put": "Action modification",
        "gateway_patch": "Action modification partielle",
        "gateway_delete": "Action suppression",
    }
    if normalized in mapping:
        return mapping[normalized]
    return str(event_type or "Notification").replace("_", " ").strip().capitalize()


def _resolve_agence_name(agence_id: int | None, token: str | None) -> str | None:
    if agence_id is None or not token:
        return None

    try:
        response = httpx.get(
            f"{AGENCE_SERVICE_URL.rstrip('/')}/{int(agence_id)}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        return None

    if response.status_code >= 400:
        return None

    payload = _safe_json(response)
    if not isinstance(payload, dict):
        return None

    agence_nom = payload.get("nom")
    if isinstance(agence_nom, str) and agence_nom.strip():
        return agence_nom.strip()
    return None


def _replace_agence_id_with_name(content: str, agence_id: int | None, agence_name: str | None) -> str:
    if not content:
        return content
    if agence_id is None or not agence_name:
        return content

    updated = content.replace(f"Agence #{agence_id}", agence_name)
    updated = updated.replace(f"agence #{agence_id}", agence_name)
    updated = updated.replace(f"Agence {agence_id}", agence_name)
    updated = updated.replace(f"agence {agence_id}", agence_name)
    return updated


def _extract_http_method_from_text(content: str) -> str | None:
    if not isinstance(content, str):
        return None
    match = re.match(r"^\s*(GET|POST|PUT|PATCH|DELETE)\b", content.strip(), re.IGNORECASE)
    if not match:
        return None
    return match.group(1).upper()


def _extract_action_path(*candidates: str | None) -> str | None:
    for raw in candidates:
        if not isinstance(raw, str):
            continue
        value = raw.strip()
        if not value:
            continue

        method = _extract_http_method_from_text(value)
        if method:
            path_part = value[len(method):].strip()
            if path_part.startswith("/"):
                return path_part

        slash_index = value.find("/api/")
        if slash_index >= 0:
            return value[slash_index:].strip()

        if value.startswith("/"):
            return value
    return None


def _resource_label_from_path(path: str | None) -> str:
    normalized = str(path or "").lower()
    if "/transfer" in normalized:
        return "transfert"
    if "/location" in normalized:
        return "location"
    if "/fleet" in normalized:
        if "/entretien" in normalized:
            return "entretien vehicule"
        if "/assurance" in normalized:
            return "assurance vehicule"
        return "gestion parc"
    if "/finance" in normalized:
        return "finance"
    if "/agences" in normalized:
        return "agence"
    if "/utilisateurs" in normalized or "/users" in normalized:
        return "utilisateur"
    if "/notifications" in normalized:
        return "notification"
    return "operation"


def _normalize_action_notification_text(
    event_type: str,
    title: str,
    message: str,
    action_url: str | None,
) -> tuple[str, str]:
    normalized_event = str(event_type or "").strip().lower()
    method = _extract_http_method_from_text(title) or _extract_http_method_from_text(message)

    if not method and normalized_event.startswith("gateway_"):
        method = normalized_event.split("_", 1)[1].upper()

    path = _extract_action_path(title, message, action_url)
    looks_technical = (
        normalized_event.startswith("gateway_")
        or (method is not None and path is not None)
        or (isinstance(title, str) and "/api/" in title)
    )

    if not looks_technical:
        return title, message

    resource_label = _resource_label_from_path(path)
    method_label_map = {
        "POST": "Creation",
        "PUT": "Mise a jour",
        "PATCH": "Mise a jour",
        "DELETE": "Suppression",
        "GET": "Consultation",
    }
    method_label = method_label_map.get(str(method or "").upper(), "Action")

    path_lower = str(path or "").lower()
    if "/cancel" in path_lower or "cancel" in path_lower or "annul" in path_lower:
        title_out = f"Annulation {resource_label}".strip().capitalize()
    else:
        title_out = f"{method_label} {resource_label}".strip()

    detail = f"Action {method_label.lower()} effectuee avec succes sur {resource_label}."
    if path:
        detail = f"{detail} Endpoint: {path}"
    return title_out, detail


def _is_visible_to_user(notification: Notification, current_user: AuthContext) -> bool:
    if current_user.is_super_admin:
        return True

    if notification.scope == "all":
        return True

    if notification.scope == "agence" and current_user.agence_id is not None:
        return int(notification.agence_id or -1) == int(current_user.agence_id)

    return False


def _build_response(
    notification: Notification,
    is_read: bool,
) -> NotificationItemResponse:
    return NotificationItemResponse(
        id=int(notification.id),
        event_type=notification.event_type,
        title=notification.title,
        message=notification.message,
        action_url=notification.action_url,
        scope=notification.scope,
        agence_id=notification.agence_id,
        channels=_normalize_channels(notification.channels),
        metadata=notification.metadata_json,
        is_read=is_read,
        created_at=notification.created_at,
    )


async def _dispatch_email(event: NotificationEventCreate, creator: AuthContext) -> bool:
    recipients: set[str] = set()

    if SUPER_ADMIN_EMAIL:
        recipients.add(SUPER_ADMIN_EMAIL.strip().lower())

    if event.user_email:
        recipients.add(event.user_email.strip().lower())

    for email in event.email_recipients:
        cleaned = str(email).strip().lower()
        if cleaned:
            recipients.add(cleaned)

    if not recipients:
        return False

    subject = f"[ERP Auto] {_prettify_event_type(event.event_type)}"
    actor = creator.email or f"user#{creator.user_id}"
    agence_nom = None
    if isinstance(event.metadata, dict):
        agence_nom = event.metadata.get("agence_nom")
    agence_scope = agence_nom or ("Agence inconnue" if event.agence_id else "Toutes les agences")
    action_html = ""
    if event.action_url:
        action_html = (
            f"<a href='http://localhost:5173{event.action_url}' "
            "style='display:inline-block;margin-top:14px;padding:10px 16px;background:#1d4ed8;"
            "color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600'>Ouvrir dans ERP Auto</a>"
        )

    event_label = _prettify_event_type(event.event_type)
    message = str(event.message or "").replace("\n", "<br/>")

    body = (
        "<div style='font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;padding:24px'>"
        "<div style='max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;"
        "border-radius:14px;overflow:hidden'>"
        "<div style='background:#0f172a;color:#fff;padding:18px 22px'>"
        "<div style='font-size:13px;opacity:.85'>ERP AUTO</div>"
        "<div style='font-size:20px;font-weight:700;margin-top:4px'>ERP Location Support</div>"
        "</div>"
        "<div style='padding:22px'>"
        f"<h2 style='margin:0 0 10px 0;color:#0f172a;font-size:20px'>{event.title}</h2>"
        f"<p style='margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.6'>{message}</p>"
        "<table style='width:100%;border-collapse:collapse;font-size:14px'>"
        f"<tr><td style='padding:8px 0;color:#64748b;width:170px'>Type</td><td style='padding:8px 0;color:#0f172a;font-weight:600'>{event_label}</td></tr>"
        f"<tr><td style='padding:8px 0;color:#64748b'>Agence</td><td style='padding:8px 0;color:#0f172a;font-weight:600'>{agence_scope}</td></tr>"
        f"<tr><td style='padding:8px 0;color:#64748b'>Declenche par</td><td style='padding:8px 0;color:#0f172a'>{actor}</td></tr>"
        f"<tr><td style='padding:8px 0;color:#64748b'>Date</td><td style='padding:8px 0;color:#0f172a'>{datetime.utcnow().strftime('%d/%m/%Y %H:%M:%S')} UTC</td></tr>"
        "</table>"
        f"{action_html}"
        "<p style='margin-top:18px;color:#94a3b8;font-size:12px'>"
        "Ce message est envoye automatiquement par ERP Auto. Merci de ne pas repondre a cet email."
        "</p>"
        "</div></div></div>"
    )

    for recipient in recipients:
        await send_email(recipient, subject, body)

    return True


async def create_notification_event(
    db: Session,
    event: NotificationEventCreate,
    creator: AuthContext,
) -> NotificationItemResponse:
    metadata = dict(event.metadata or {})
    agence_name = _resolve_agence_name(event.agence_id, creator.token)
    if agence_name:
        metadata["agence_nom"] = agence_name

    title = _replace_agence_id_with_name(event.title, event.agence_id, agence_name)
    message = _replace_agence_id_with_name(event.message, event.agence_id, agence_name)
    title, message = _normalize_action_notification_text(event.event_type, title, message, event.action_url)

    channels = list(dict.fromkeys([item.strip().lower() for item in event.channels]))
    channels_csv = ",".join(channels)

    notification = Notification(
        event_type=event.event_type,
        title=title,
        message=message,
        action_url=event.action_url,
        scope=event.scope,
        agence_id=event.agence_id,
        channels=channels_csv,
        metadata_json=metadata,
        created_by_user_id=creator.user_id,
        created_by_role=creator.role,
        created_by_email=creator.email,
        email_sent=False,
    )

    db.add(notification)
    db.flush()

    if "email" in channels:
        email_payload = NotificationEventCreate(
            event_type=event.event_type,
            title=title,
            message=message,
            channels=channels,
            scope=event.scope,
            agence_id=event.agence_id,
            action_url=event.action_url,
            metadata=metadata,
            user_email=event.user_email,
            email_recipients=event.email_recipients,
        )
        notification.email_sent = await _dispatch_email(email_payload, creator)

    db.commit()
    db.refresh(notification)

    return _build_response(notification, is_read=False)


def list_notifications(
    db: Session,
    current_user: AuthContext,
    limit: int,
    offset: int,
    unread_only: bool,
) -> list[NotificationItemResponse]:
    query = db.query(Notification)

    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Notification.scope == "all",
                and_(Notification.scope == "agence", Notification.agence_id == current_user.agence_id),
            )
        )

    query = query.order_by(Notification.created_at.desc(), Notification.id.desc())

    notifications = query.offset(offset).limit(limit).all()
    if not notifications:
        return []

    notification_ids = [int(item.id) for item in notifications]

    read_rows = (
        db.query(NotificationRead.notification_id)
        .filter(
            NotificationRead.user_id == current_user.user_id,
            NotificationRead.notification_id.in_(notification_ids),
        )
        .all()
    )
    read_ids = {int(row[0]) for row in read_rows}

    items = []
    for notification in notifications:
        is_read = int(notification.id) in read_ids
        if unread_only and is_read:
            continue
        if not _is_visible_to_user(notification, current_user):
            continue
        items.append(_build_response(notification, is_read=is_read))

    return items


def get_unread_count(db: Session, current_user: AuthContext) -> int:
    query = db.query(func.count(Notification.id))

    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Notification.scope == "all",
                and_(Notification.scope == "agence", Notification.agence_id == current_user.agence_id),
            )
        )

    query = query.filter(
        ~Notification.id.in_(
            db.query(NotificationRead.notification_id).filter(
                NotificationRead.user_id == current_user.user_id
            )
        )
    )

    result = query.scalar()
    return int(result or 0)


def mark_read(db: Session, notification_id: int, current_user: AuthContext) -> None:
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if notification is None:
        return

    if not _is_visible_to_user(notification, current_user):
        return

    existing = (
        db.query(NotificationRead)
        .filter(
            NotificationRead.notification_id == notification_id,
            NotificationRead.user_id == current_user.user_id,
        )
        .first()
    )

    if existing:
        return

    db.add(
        NotificationRead(
            notification_id=notification_id,
            user_id=current_user.user_id,
        )
    )
    db.commit()


def mark_all_read(db: Session, current_user: AuthContext) -> int:
    query = db.query(Notification)
    if not current_user.is_super_admin:
        query = query.filter(
            or_(
                Notification.scope == "all",
                and_(Notification.scope == "agence", Notification.agence_id == current_user.agence_id),
            )
        )

    visible_ids = [int(row[0]) for row in query.with_entities(Notification.id).all()]
    if not visible_ids:
        return 0

    existing_rows = (
        db.query(NotificationRead.notification_id)
        .filter(
            NotificationRead.user_id == current_user.user_id,
            NotificationRead.notification_id.in_(visible_ids),
        )
        .all()
    )
    existing_ids = {int(row[0]) for row in existing_rows}

    to_insert = [
        NotificationRead(notification_id=notification_id, user_id=current_user.user_id)
        for notification_id in visible_ids
        if notification_id not in existing_ids
    ]

    if not to_insert:
        return 0

    db.add_all(to_insert)
    db.commit()
    return len(to_insert)
