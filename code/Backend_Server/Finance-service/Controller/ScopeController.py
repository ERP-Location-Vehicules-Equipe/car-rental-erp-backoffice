import os
from typing import Any

import httpx
from fastapi import HTTPException

from dependencies.FinanceDependencies import AuthContext


LOCATION_SERVICE_URL = os.getenv("LOCATION_SERVICE_URL", "http://location_service:8005")
SERVICE_HTTP_TIMEOUT_SECONDS = float(os.getenv("SERVICE_HTTP_TIMEOUT_SECONDS", "8"))


def _response_json_safe(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError:
        return None


def _fetch_locations(user: AuthContext) -> list[dict]:
    try:
        response = httpx.get(
            f"{LOCATION_SERVICE_URL.rstrip('/')}/locations/",
            headers={"Authorization": f"Bearer {user.token}"},
            timeout=SERVICE_HTTP_TIMEOUT_SECONDS,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Unable to reach location service")

    payload = _response_json_safe(response)

    if response.status_code in {401, 403}:
        raise HTTPException(status_code=403, detail="Not allowed to load location scope")
    if response.status_code >= 500:
        raise HTTPException(status_code=502, detail="Location service error")
    if response.status_code >= 400:
        detail = (payload or {}).get("detail", "Unable to load locations")
        raise HTTPException(status_code=400, detail=detail)

    if not isinstance(payload, list):
        raise HTTPException(status_code=502, detail="Location service returned invalid payload")

    return payload


def get_allowed_location_ids(user: AuthContext) -> set[int] | None:
    if user.is_super_admin:
        return None

    if user.agence_id is None:
        return set()

    locations = _fetch_locations(user)

    location_ids: set[int] = set()
    for item in locations:
        location_id = item.get("id") if isinstance(item, dict) else None
        if location_id is None:
            continue
        try:
            location_ids.add(int(location_id))
        except (TypeError, ValueError):
            continue

    return location_ids


def get_location_snapshot(location_id: int, user: AuthContext) -> dict:
    try:
        target_id = int(location_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid location id")

    locations = _fetch_locations(user)
    for item in locations:
        if not isinstance(item, dict):
            continue
        try:
            item_id = int(item.get("id"))
        except (TypeError, ValueError):
            continue
        if item_id == target_id:
            return item

    raise HTTPException(status_code=404, detail="Location not found in your scope")
