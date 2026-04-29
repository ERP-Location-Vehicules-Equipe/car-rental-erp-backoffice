from datetime import datetime

from app.api import notification as notification_api
from app.schemas.notification import NotificationItemResponse
from tests.conftest import auth_headers


def _sample_item(notification_id: int = 1, channels: list[str] | None = None) -> NotificationItemResponse:
    return NotificationItemResponse(
        id=notification_id,
        event_type="location_created",
        title="Location creee",
        message="Une location a ete creee.",
        action_url="/locations/1",
        scope="agence",
        agence_id=1,
        channels=channels or ["popup"],
        metadata={"car_name": "Renault Clio"},
        is_read=False,
        created_at=datetime(2026, 4, 1, 10, 0, 0),
    )


def test_root_route(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Notification Service running"}


def test_notify_legacy_route(client, monkeypatch):
    async def _fake_create_event(db, event, current_user):
        return _sample_item(3, channels=["popup"])

    monkeypatch.setattr(notification_api, "create_notification_event", _fake_create_event)
    monkeypatch.setattr(notification_api, "handle_popup_sync", lambda payload: {"ok": True, "payload": payload})

    response = client.post(
        "/notifications/notify",
        json={
            "type": "transfer",
            "channels": ["popup"],
            "car_name": "Dacia Sandero",
            "source_agency": "Casablanca",
            "destination_agency": "Rabat",
            "agence_id": 1,
        },
        headers=auth_headers(role="admin", agence_id=1),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Processed"
    assert body["popup"]["ok"] is True
    assert body["notification"]["id"] == 3


def test_create_event_route(client, monkeypatch):
    async def _fake_create_event(db, payload, current_user):
        return _sample_item(5, channels=["email"])

    monkeypatch.setattr(notification_api, "create_notification_event", _fake_create_event)

    response = client.post(
        "/notifications/events",
        json={
            "event_type": "transfer_created",
            "title": "Transfert cree",
            "message": "Un transfert a ete cree.",
            "channels": ["email"],
            "scope": "agence",
            "agence_id": 1,
        },
        headers=auth_headers(role="admin", agence_id=1),
    )

    assert response.status_code == 200
    assert response.json()["id"] == 5
    assert response.json()["channels"] == ["email"]


def test_get_inbox_route(client, monkeypatch):
    monkeypatch.setattr(notification_api, "list_notifications", lambda **kwargs: [_sample_item(7)])

    response = client.get(
        "/notifications/inbox?limit=10&offset=0&unread_only=true",
        headers=auth_headers(role="admin", agence_id=1),
    )

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == 7


def test_unread_count_route(client, monkeypatch):
    monkeypatch.setattr(notification_api, "get_unread_count", lambda db, current_user: 4)

    response = client.get("/notifications/unread-count", headers=auth_headers(role="admin", agence_id=1))

    assert response.status_code == 200
    assert response.json() == {"unread_count": 4}


def test_mark_notification_read_route(client, monkeypatch):
    called = {"value": False}

    def _fake_mark_read(db, notification_id, current_user):
        called["value"] = True

    monkeypatch.setattr(notification_api, "mark_read", _fake_mark_read)

    response = client.patch("/notifications/19/read", headers=auth_headers(role="admin", agence_id=1))

    assert response.status_code == 200
    assert response.json()["message"] == "Notification marked as read"
    assert called["value"] is True


def test_mark_all_notifications_as_read_route(client, monkeypatch):
    monkeypatch.setattr(notification_api, "mark_all_read", lambda db, current_user: 2)

    response = client.patch("/notifications/read-all", headers=auth_headers(role="admin", agence_id=1))

    assert response.status_code == 200
    assert response.json()["message"] == "2 notifications marked as read"
