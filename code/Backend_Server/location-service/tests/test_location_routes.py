from datetime import datetime
from types import SimpleNamespace

from app.Routes import location_routes
from tests.conftest import auth_headers


def _sample_location(location_id: int = 1, etat: str = "en_cours") -> dict:
    return {
        "id": location_id,
        "client_id": 10,
        "vehicle_id": 20,
        "agence_depart_id": 1,
        "agence_retour_id": 2,
        "date_debut": datetime(2026, 4, 1, 9, 0, 0),
        "date_fin_prevue": datetime(2026, 4, 3, 9, 0, 0),
        "date_retour_reelle": None,
        "tarif_jour": 450.0,
        "montant_total": 900.0,
        "etat": etat,
        "created_at": datetime(2026, 4, 1, 8, 0, 0),
    }


def _create_payload() -> dict:
    return {
        "client_id": 10,
        "vehicle_id": 20,
        "agence_depart_id": 1,
        "agence_retour_id": 2,
        "date_debut": "2026-04-01T09:00:00",
        "date_fin_prevue": "2026-04-03T09:00:00",
        "tarif_jour": 450.0,
        "etat": "en_cours",
    }


def test_create_location_route(client, monkeypatch):
    monkeypatch.setattr(location_routes, "create_location", lambda db, location_data, current_user: _sample_location())

    response = client.post("/locations/", json=_create_payload(), headers=auth_headers(role="super_admin"))

    assert response.status_code == 201
    assert response.json()["id"] == 1
    assert response.json()["etat"] == "en_cours"


def test_list_locations_route(client, monkeypatch):
    monkeypatch.setattr(location_routes, "get_all_locations", lambda db, current_user: [_sample_location()])

    response = client.get("/locations/", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == 1


def test_location_stats_route(client, monkeypatch):
    monkeypatch.setattr(
        location_routes,
        "get_stats",
        lambda db, current_user: {
            "total": 5,
            "en_cours": 2,
            "terminees": 2,
            "annulees": 1,
            "revenue": 15000.0,
        },
    )

    response = client.get("/locations/stats", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()["total"] == 5


def test_get_location_by_id_route(client, monkeypatch):
    monkeypatch.setattr(location_routes, "get_location_or_404", lambda db, location_id: _sample_location(location_id))
    monkeypatch.setattr(location_routes, "assert_location_scope", lambda location, current_user: None)

    response = client.get("/locations/9", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json()["id"] == 9


def test_get_location_contract_pdf_route(client, monkeypatch):
    monkeypatch.setattr(
        location_routes,
        "get_location_or_404",
        lambda db, location_id: SimpleNamespace(**_sample_location(location_id)),
    )
    monkeypatch.setattr(location_routes, "assert_location_scope", lambda location, current_user: None)
    monkeypatch.setattr(location_routes, "build_location_contract_pdf", lambda location, current_user: b"%PDF-1.4 fake")

    response = client.get("/locations/4/contrat-pdf", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "contrat-location-4.pdf" in response.headers["content-disposition"]


def test_update_location_route(client, monkeypatch):
    monkeypatch.setattr(location_routes, "update_location", lambda db, location_id, location_data, current_user: _sample_location(location_id))

    response = client.put(
        "/locations/7",
        json={"tarif_jour": 500.0},
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["id"] == 7


def test_delete_location_route(client, monkeypatch):
    called = {"value": False}

    def _fake_delete(db, location_id, current_user):
        called["value"] = True

    monkeypatch.setattr(location_routes, "delete_location", _fake_delete)

    response = client.delete("/locations/3", headers=auth_headers(role="super_admin"))

    assert response.status_code == 204
    assert called["value"] is True


def test_update_location_status_route(client, monkeypatch):
    monkeypatch.setattr(
        location_routes,
        "update_location_status",
        lambda db, location_id, etat, current_user: SimpleNamespace(etat="terminee"),
    )

    response = client.put(
        "/locations/11/status",
        json={"etat": "terminee"},
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Status updated", "etat": "terminee"}


def test_process_return_route(client, monkeypatch):
    monkeypatch.setattr(
        location_routes,
        "process_return",
        lambda db, location_id, payload, current_user: {
            "message": "Retour processed successfully",
            "delay_days": 1,
            "penalty": 450.0,
            "new_total": 1350.0,
        },
    )

    response = client.put(
        "/locations/5/retour",
        json={"date_retour_reelle": "2026-04-04T10:00:00"},
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["new_total"] == 1350.0


def test_extend_location_route(client, monkeypatch):
    monkeypatch.setattr(
        location_routes,
        "extend_location",
        lambda db, location_id, payload, current_user: {
            "message": "Location extended successfully",
            "new_date_fin": "2026-04-05T09:00:00",
            "new_total": 1800.0,
        },
    )

    response = client.put(
        "/locations/6/prolonger",
        json={"date_fin_prevue": "2026-04-05T09:00:00"},
        headers=auth_headers(role="super_admin"),
    )

    assert response.status_code == 200
    assert response.json()["new_total"] == 1800.0
