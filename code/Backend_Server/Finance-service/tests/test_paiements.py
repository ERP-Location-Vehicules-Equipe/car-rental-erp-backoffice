def _create_facture(client, auth_headers):
    response = client.post(
        "/api/factures/",
        json={"location_id": 1, "montant_ht": 1000.0, "tva": 20.0},
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_create_paiement(client, auth_headers):
    facture_id = _create_facture(client, auth_headers)
    response = client.post(
        "/api/paiements/",
        json={
            "location_id": 1,
            "facture_id": facture_id,
            "montant": 1200.0,
            "mode": "virement",
            "reference": "VIR-TEST-1",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "virement"
    assert float(data["montant"]) == 1200.0


def test_get_all_paiements(client, auth_headers):
    response = client.get("/api/paiements/", headers=auth_headers)
    assert response.status_code == 200
    assert "paiements" in response.json()


def test_get_paiements_by_facture(client, auth_headers):
    facture_id = _create_facture(client, auth_headers)
    response = client.get(f"/api/paiements/facture/{facture_id}", headers=auth_headers)
    assert response.status_code == 200
    assert "paiements" in response.json()


def test_paiement_facture_not_found(client, auth_headers):
    response = client.post(
        "/api/paiements/",
        json={
            "location_id": 1,
            "facture_id": 9999,
            "montant": 500.0,
            "mode": "especes",
        },
        headers=auth_headers,
    )
    assert response.status_code == 404
