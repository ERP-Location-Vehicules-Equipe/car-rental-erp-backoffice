import os
from typing import Any

import httpx

from dependencies.auth import AuthContext

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def emit_fleet_event(
    *,
    current_user: AuthContext,
    event_type: str,
    title: str,
    message: str,
    agence_id: int | None = None,
    action_url: str = "/fleet",
    metadata: dict[str, Any] | None = None,
) -> bool:
    if not current_user.token:
        return False

    scope = "agence" if agence_id is not None else "all"
    payload = {
        "event_type": event_type,
        "title": title,
        "message": message,
        "channels": ["popup", "email"],
        "scope": scope,
        "agence_id": int(agence_id) if agence_id is not None else None,
        "action_url": action_url,
        "metadata": metadata or {},
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
