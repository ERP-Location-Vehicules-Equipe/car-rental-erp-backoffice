from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import AuthContext, get_current_user
from app.schemas.notification import (
    MarkReadResponse,
    NotificationEventCreate,
    NotificationItemResponse,
    NotificationRequest,
    UnreadCountResponse,
)
from app.services.notification_center import (
    create_notification_event,
    get_unread_count,
    list_notifications,
    mark_all_read,
    mark_read,
)
from app.services.popup.handler import handle_popup_sync

router = APIRouter()


@router.post("/notify")
async def notify_legacy(
    request: NotificationRequest,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    event = request.to_event_payload()
    created = await create_notification_event(db, event, current_user)

    popup = None
    if "popup" in created.channels:
        popup = handle_popup_sync(
            {
                "type": created.event_type,
                "car_name": (created.metadata or {}).get("car_name"),
                "client_name": (created.metadata or {}).get("client_name"),
                "source_agency": (created.metadata or {}).get("source_agency"),
                "destination_agency": (created.metadata or {}).get("destination_agency"),
                "status": (created.metadata or {}).get("status"),
                "maintenance_due_date": (created.metadata or {}).get("maintenance_due_date"),
                "car_id": (created.metadata or {}).get("car_id"),
                "loan_time": (created.metadata or {}).get("loan_time"),
            }
        )

    return {
        "message": "Processed",
        "popup": popup,
        "notification": created.model_dump(),
    }


@router.post("/events", response_model=NotificationItemResponse)
async def create_event(
    payload: NotificationEventCreate,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return await create_notification_event(db, payload, current_user)


@router.get("/inbox", response_model=list[NotificationItemResponse])
def get_inbox(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    unread_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return list_notifications(
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset,
        unread_only=unread_only,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
def unread_count(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    return UnreadCountResponse(unread_count=get_unread_count(db, current_user))


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    mark_read(db, notification_id, current_user)
    return MarkReadResponse(message="Notification marked as read")


@router.patch("/read-all", response_model=MarkReadResponse)
def mark_notifications_read_all(
    db: Session = Depends(get_db),
    current_user: AuthContext = Depends(get_current_user),
):
    count = mark_all_read(db, current_user)
    return MarkReadResponse(message=f"{count} notifications marked as read")