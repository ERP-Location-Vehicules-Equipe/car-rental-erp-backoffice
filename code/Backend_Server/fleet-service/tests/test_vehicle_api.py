def make_vehicle_payload(**overrides):
    payload = {
        "agence_id": 1,
        "modele_id": 1,
        "categorie_id": 1,
        "immatriculation": "12345-A-6",
        "date_mise_en_circulation": "2026-03-20T09:00:00",
        "kilometrage": 15000,
        "nombre_places": 5,
        "statut": "disponible",
        "prix_location": 450.0,
        "valeur_achat": 220000.0,
    }
    payload.update(overrides)
    return payload


def test_create_vehicle_returns_201_and_persists_data(client):
    response = client.post("/vehicles/", json=make_vehicle_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == 1
    assert body["immatriculation"] == "12345-A-6"
    assert body["statut"] == "disponible"


def test_update_vehicle_status_endpoint_updates_only_status(client):
    create_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = create_response.json()["id"]

    response = client.patch(
        f"/vehicles/{vehicle_id}/status",
        json={"statut": "maintenance"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == vehicle_id
    assert body["statut"] == "maintenance"
    assert body["immatriculation"] == "12345-A-6"


def test_update_vehicle_with_invalid_status_returns_422(client):
    create_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = create_response.json()["id"]

    response = client.put(
        f"/vehicles/{vehicle_id}",
        json={"statut": "invalid_status"},
    )

    assert response.status_code == 422


def test_delete_vehicle_also_deletes_related_maintenances(client):
    create_response = client.post("/vehicles/", json=make_vehicle_payload())
    vehicle_id = create_response.json()["id"]

    maintenance_response = client.post(
        f"/vehicles/{vehicle_id}/maintenances",
        json={
            "type_maintenance": "preventive",
            "description": "Suppression en cascade",
            "date_debut": "2026-03-27T10:00:00",
            "date_fin": "2026-03-27T12:00:00",
            "cout": 450.0,
            "prestataire": "Garage Atlas",
            "statut": "en_cours",
        },
    )
    maintenance_id = maintenance_response.json()["id"]

    response = client.delete(f"/vehicles/{vehicle_id}")

    assert response.status_code == 204
    assert client.get(f"/vehicles/{vehicle_id}").status_code == 404
    assert client.get(f"/maintenances/{maintenance_id}").status_code == 404
