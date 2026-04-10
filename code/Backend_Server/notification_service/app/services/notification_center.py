import os
from datetime import datetime

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.dependencies.auth import AuthContext
from app.models.notification import Notification, NotificationRead
from app.schemas.notification import NotificationEventCreate, NotificationItemResponse
from app.services.email.email_service import send_email


SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "saidouchrif16@gmail.com")


def _normalize_channels(channels_raw: str) -> list[str]:
    values = [item.strip() for item in (channels_raw or "").split(",") if item.strip()]
    return values or ["popup"]


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

    subject = f"[ERP Auto] {event.title}"
    actor = creator.email or f"user#{creator.user_id}"
    agence_scope = f"Agence #{event.agence_id}" if event.agence_id else "Toutes les agences"
    action_html = ""
    if event.action_url:
        action_html = (
            f"<p><a href='http://localhost:5173{event.action_url}' "
            "style='color:#2563eb;font-weight:600'>Voir l'action dans ERP Auto</a></p>"
        )

    body = (
        "<h3>Nouvelle notification ERP Auto</h3>"
        f"<p><strong>{event.title}</strong></p>"
        f"<p>{event.message}</p>"
        f"<p><strong>Evenement:</strong> {event.event_type}</p>"
        f"<p><strong>Portee:</strong> {agence_scope}</p>"
        f"<p><strong>Declenche par:</strong> {actor}</p>"
        f"<p><strong>Date:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>"
        f"{action_html}"
    )

    for recipient in recipients:
        await send_email(recipient, subject, body)

    return True


async def create_notification_event(
    db: Session,
    event: NotificationEventCreate,
    creator: AuthContext,
) -> NotificationItemResponse:
    channels = list(dict.fromkeys([item.strip().lower() for item in event.channels]))
    channels_csv = ",".join(channels)

    notification = Notification(
        event_type=event.event_type,
        title=event.title,
        message=event.message,
        action_url=event.action_url,
        scope=event.scope,
        agence_id=event.agence_id,
        channels=channels_csv,
        metadata_json=event.metadata,
        created_by_user_id=creator.user_id,
        created_by_role=creator.role,
        created_by_email=creator.email,
        email_sent=False,
    )

    db.add(notification)
    db.flush()

    if "email" in channels:
        notification.email_sent = await _dispatch_email(event, creator)

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