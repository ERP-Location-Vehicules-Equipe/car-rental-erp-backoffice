from tests.test_vehicle_api import make_vehicle_payload


def make_entretien_payload(vehicle_id: int, **overrides):
    payload = {
        "vehicle_id": vehicle_id,
        "type_entretien": "preventive",
        "description": "Vidange complete",
        "date_debut": "2026-03-27T10:00:00",
        "date_fin": "2026-03-27T12:00:00",
        "cout": 450.0,
        "prestataire": "Garage Atlas",
        "statut": "en_cours",
    }
    payload.update(overrides)
    return payload


def test_create_entretien_persists_for_vehicle(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]

    response = client.post(
        "/entretiens/",
        json=make_entretien_payload(vehicle_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["vehicle_id"] == vehicle_id
    assert body["statut"] == "en_cours"

    vehicle_after = client.get(f"/vehicles/{vehicle_id}")
    assert vehicle_after.status_code == 200
    assert vehicle_after.json()["statut"] == "disponible"


def test_list_vehicle_entretiens_returns_created_items(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]
    client.post(
        "/entretiens/",
        json=make_entretien_payload(vehicle_id),
    )

    response = client.get(f"/vehicles/{vehicle_id}/entretiens")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["description"] == "Vidange complete"


def test_update_entretien_to_terminee_restores_vehicle_status(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]
    entretien_response = client.post(
        "/entretiens/",
        json=make_entretien_payload(vehicle_id),
    )
    entretien_id = entretien_response.json()["id"]

    response = client.put(
        f"/entretiens/{entretien_id}",
        json={"statut": "terminee", "date_fin": "2026-03-27T13:00:00"},
    )

    assert response.status_code == 200
    assert response.json()["statut"] == "terminee"

    vehicle_after = client.get(f"/vehicles/{vehicle_id}")
    assert vehicle_after.status_code == 200
    assert vehicle_after.json()["statut"] == "disponible"


def test_create_entretien_with_invalid_dates_returns_422(client):
    vehicle_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = vehicle_response.json()["id"]

    response = client.post(
        "/entretiens/",
        json=make_entretien_payload(
            vehicle_id,
            date_debut="2026-03-27T15:00:00",
            date_fin="2026-03-27T12:00:00",
        ),
    )

    assert response.status_code == 422
