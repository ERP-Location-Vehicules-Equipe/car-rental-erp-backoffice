def test_rapport_financier(client, auth_headers):
    response = client.get("/api/rapport/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_factures" in data
    assert "total_paiements" in data
    assert "total_charges" in data
    assert "solde_net" in data
    assert "factures_en_attente" in data
    assert "factures_payees" in data


def test_rapport_requires_admin(client):
    # No token => 403
    response = client.get("/api/rapport/")
    assert response.status_code == 403
