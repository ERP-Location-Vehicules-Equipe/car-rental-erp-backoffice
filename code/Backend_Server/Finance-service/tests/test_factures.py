def test_create_facture(client, auth_headers):
    response = client.post("/api/factures/", json={
        "location_id": 1,
        "montant_ht": 1000.0,
        "tva": 20.0
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert float(data["montant_ttc"]) == 1200.0
    assert data["statut"] == "en_attente"
    assert data["numero"].startswith("FAC-")


def test_get_all_factures(client, auth_headers):
    response = client.get("/api/factures/", headers=auth_headers)
    assert response.status_code == 200
    assert "factures" in response.json()


def test_get_facture_by_id(client, auth_headers):
    response = client.get("/api/factures/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == 1


def test_update_facture_statut(client, auth_headers):
    response = client.put("/api/factures/1", json={
        "statut": "payée"
    }, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["statut"] == "payee"


def test_facture_not_found(client, auth_headers):
    response = client.get("/api/factures/9999", headers=auth_headers)
    assert response.status_code == 404
