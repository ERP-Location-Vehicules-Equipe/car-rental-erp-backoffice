def test_create_paiement(client, auth_headers):
    response = client.post("/api/paiements/", json={
        "facture_id": 1,
        "montant": 1200.0,
        "mode": "virement"
    }, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "virement"
    assert data["montant"] == 1200.0


def test_get_all_paiements(client, auth_headers):
    response = client.get("/api/paiements/", headers=auth_headers)
    assert response.status_code == 200
    assert "paiements" in response.json()


def test_get_paiements_by_facture(client, auth_headers):
    response = client.get("/api/paiements/facture/1", headers=auth_headers)
    assert response.status_code == 200
    assert "paiements" in response.json()


def test_paiement_facture_not_found(client, auth_headers):
    response = client.post("/api/paiements/", json={
        "facture_id": 9999,
        "montant": 500.0,
        "mode": "espèces"
    }, headers=auth_headers)
    assert response.status_code == 404
