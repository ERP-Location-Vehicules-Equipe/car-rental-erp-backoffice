import os
from typing import Any

import httpx

from dependencies.FinanceDependencies import AuthContext

NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification_service:8006")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def _safe_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def emit_finance_event(
    *,
    user: AuthContext,
    event_type: str,
    title: str,
    message: str,
    agence_id: int | None = None,
    action_url: str = "/finance",
    metadata: dict | None = None,
) -> bool:
    if not user.token:
        return False

    scope = "all" if user.is_super_admin and agence_id is None else "agence"

    payload = {
        "event_type": event_type,
        "title": title,
        "message": message,
        "channels": ["popup", "email"],
        "scope": scope,
        "agence_id": agence_id,
        "action_url": action_url,
        "metadata": metadata or {},
        "user_email": user.email,
        "email_recipients": [user.email] if user.email else [],
    }

    try:
        response = httpx.post(
            f"{NOTIFICATION_SERVICE_URL.rstrip('/')}/notifications/events",
            headers={"Authorization": f"Bearer {user.token}"},
            json=payload,
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        return False

    if response.status_code >= 400:
        _ = _safe_json(response)
        return False

    return True
