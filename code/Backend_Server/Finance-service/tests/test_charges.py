def test_create_charge(client, auth_headers):
    response = client.post("/api/charges/", json={
        "type": "carburant",
        "vehicule_id": 1,
        "montant": 350.0,
        "description": "Plein carburant"
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "carburant"
    assert float(data["montant"]) == 350.0


def test_get_all_charges(client, auth_headers):
    response = client.get("/api/charges/", headers=auth_headers)
    assert response.status_code == 200
    assert "charges" in response.json()


def test_get_charges_by_vehicule(client, auth_headers):
    response = client.get("/api/charges/vehicule/1", headers=auth_headers)
    assert response.status_code == 200
    assert "charges" in response.json()


def test_update_charge(client, auth_headers):
    response = client.put("/api/charges/1", json={
        "montant": 400.0
    }, headers=auth_headers)
    assert response.status_code == 200
    assert float(response.json()["montant"]) == 400.0
