from datetime import datetime

from app.routes import transfer_routes
from tests.conftest import auth_headers


def _sample_transfer(transfer_id: int = 1, etat: str = "PENDING") -> dict:
    return {
        "id": transfer_id,
        "vehicule_id": 5,
        "agence_source_id": 1,
        "agence_destination_id": 2,
        "etat": etat,
        "date_depart": datetime(2026, 4, 1, 9, 0, 0),
        "date_arrivee_prevue": datetime(2026, 4, 2, 9, 0, 0),
        "date_arrivee_reelle": None,
        "reason": "Rotation flotte",
        "notes": "RAS",
        "created_by": "admin-1",
        "created_at": datetime(2026, 4, 1, 8, 0, 0),
        "updated_at": datetime(2026, 4, 1, 8, 30, 0),
    }


def _create_payload() -> dict:
    return {
        "vehicule_id": 5,
        "agence_source_id": 1,
        "agence_destination_id": 2,
        "date_depart": "2026-04-01T09:00:00",
        "date_arrivee_prevue": "2026-04-02T09:00:00",
        "reason": "Rotation flotte",
        "notes": "RAS",
    }


def test_root_route(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Transfer Service is running"}


def test_create_transfer_route(client, monkeypatch):
    monkeypatch.setattr(transfer_routes, "create_transfer", lambda db, request, current_user: _sample_transfer(4))

    response = client.post("/transferts/", json=_create_payload(), headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()["id"] == 4


def test_get_transfer_candidates_route(client, monkeypatch):
    monkeypatch.setattr(
        transfer_routes,
        "get_transfer_candidates",
        lambda db, current_user, source_agence_id, include_my_agence: {
            "total": 1,
            "vehicles": [
                {
                    "id": 5,
                    "immatriculation": "12345-A-6",
                    "modele_id": 9,
                    "agence_id": 1,
                    "statut": "disponible",
                    "prix_location": 450.0,
                }
            ],
        },
    )

    response = client.get(
        "/transferts/disponibilites?source_agence_id=1&include_my_agence=true",
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_get_all_transfers_route(client, monkeypatch):
    monkeypatch.setattr(transfer_routes, "get_all_transfers", lambda db, current_user: [_sample_transfer(10)])

    response = client.get("/transferts/", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == 10


def test_get_transfers_by_vehicle_route(client, monkeypatch):
    monkeypatch.setattr(
        transfer_routes,
        "get_transfers_by_vehicle",
        lambda db, vehicule_id, current_user: [_sample_transfer(11)],
    )

    response = client.get("/transferts/vehicule/5", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()[0]["vehicule_id"] == 5


def test_get_transfer_by_id_route(client, monkeypatch):
    monkeypatch.setattr(transfer_routes, "get_transfer_by_id", lambda db, transfer_id, current_user: _sample_transfer(transfer_id))

    response = client.get("/transferts/8", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()["id"] == 8


def test_update_transfer_route(client, monkeypatch):
    monkeypatch.setattr(
        transfer_routes,
        "update_transfer",
        lambda db, transfer_id, request, current_user: _sample_transfer(transfer_id),
    )

    response = client.put(
        "/transferts/6",
        json={"notes": "Mise a jour route"},
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["id"] == 6


def test_update_transfer_status_route(client, monkeypatch):
    monkeypatch.setattr(
        transfer_routes,
        "update_transfer_status",
        lambda db, transfer_id, request, current_user: _sample_transfer(transfer_id, etat="IN_TRANSIT"),
    )

    response = client.put(
        "/transferts/7/status",
        json={
            "etat": "IN_TRANSIT",
            "date_depart": "2026-04-01T09:00:00",
            "date_arrivee_prevue": "2026-04-02T09:00:00",
        },
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["etat"] == "IN_TRANSIT"


def test_cancel_transfer_route(client, monkeypatch):
    monkeypatch.setattr(
        transfer_routes,
        "cancel_transfer",
        lambda db, transfer_id, current_user: _sample_transfer(transfer_id, etat="CANCELLED"),
    )

    response = client.put("/transferts/12/cancel", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()["etat"] == "CANCELLED"


def test_delete_transfer_route(client, monkeypatch):
    called = {"value": False}

    def _fake_delete(db, transfer_id, current_user):
        called["value"] = True

    monkeypatch.setattr(transfer_routes, "delete_transfer", _fake_delete)

    response = client.delete("/transferts/14", headers=auth_headers(role="super_admin"))

    assert response.status_code == 204
    assert called["value"] is True
