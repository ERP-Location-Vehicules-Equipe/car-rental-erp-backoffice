from tests.test_vehicle_api import make_vehicle_payload


def make_maintenance_payload(**overrides):
    payload = {
        "type_maintenance": "preventive",
        "description": "Vidange complete",
        "date_debut": "2026-03-27T10:00:00",
        "date_fin": "2026-03-27T12:00:00",
        "cout": 450.0,
        "prestataire": "Garage Atlas",
        "statut": "en_cours",
    }
    payload.update(overrides)
    return payload


def test_create_maintenance_sets_vehicle_status_to_maintenance(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]

    response = client.post(
        f"/vehicles/{vehicle_id}/maintenances",
        json=make_maintenance_payload(),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["vehicle_id"] == vehicle_id
    assert body["statut"] == "en_cours"

    vehicle_after = client.get(f"/vehicles/{vehicle_id}")
    assert vehicle_after.status_code == 200
    assert vehicle_after.json()["statut"] == "maintenance"


def test_list_vehicle_maintenances_returns_created_items(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]
    client.post(
        f"/vehicles/{vehicle_id}/maintenances",
        json=make_maintenance_payload(),
    )

    response = client.get(f"/vehicles/{vehicle_id}/maintenances")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["description"] == "Vidange complete"


def test_update_maintenance_to_terminee_restores_vehicle_status(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]
    maintenance_response = client.post(
        f"/vehicles/{vehicle_id}/maintenances",
        json=make_maintenance_payload(),
    )
    maintenance_id = maintenance_response.json()["id"]

    response = client.put(
        f"/maintenances/{maintenance_id}",
        json={"statut": "terminee", "date_fin": "2026-03-27T13:00:00"},
    )

    assert response.status_code == 200
    assert response.json()["statut"] == "terminee"

    vehicle_after = client.get(f"/vehicles/{vehicle_id}")
    assert vehicle_after.status_code == 200
    assert vehicle_after.json()["statut"] == "disponible"


def test_create_maintenance_with_invalid_dates_returns_422(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]

    response = client.post(
        f"/vehicles/{vehicle_id}/maintenances",
        json=make_maintenance_payload(
            date_debut="2026-03-27T15:00:00",
            date_fin="2026-03-27T12:00:00",
        ),
    )

    assert response.status_code == 422
