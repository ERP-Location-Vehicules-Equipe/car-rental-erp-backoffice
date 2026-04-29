def test_categories_crud_flow(client):
    create_response = client.post(
        "/categories/",
        json={"libelle": "SUV", "tarif_jour_base": 700.0},
    )

    assert create_response.status_code == 201
    categorie_id = create_response.json()["id"]

    list_response = client.get("/categories/")
    assert list_response.status_code == 200
    assert any(item["id"] == categorie_id for item in list_response.json())

    get_response = client.get(f"/categories/{categorie_id}")
    assert get_response.status_code == 200
    assert get_response.json()["libelle"] == "SUV"

    update_response = client.put(
        f"/categories/{categorie_id}",
        json={"libelle": "SUV Premium", "tarif_jour_base": 750.0},
    )
    assert update_response.status_code == 200
    assert update_response.json()["libelle"] == "SUV Premium"

    delete_response = client.delete(f"/categories/{categorie_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/categories/{categorie_id}").status_code == 404


def test_marques_crud_flow(client):
    create_response = client.post(
        "/marques/",
        json={"nom": "Renault"},
    )

    assert create_response.status_code == 201
    marque_id = create_response.json()["id"]

    list_response = client.get("/marques/")
    assert list_response.status_code == 200
    assert any(item["id"] == marque_id for item in list_response.json())

    get_response = client.get(f"/marques/{marque_id}")
    assert get_response.status_code == 200
    assert get_response.json()["nom"] == "Renault"

    update_response = client.put(
        f"/marques/{marque_id}",
        json={"nom": "Dacia"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["nom"] == "Dacia"

    delete_response = client.delete(f"/marques/{marque_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/marques/{marque_id}").status_code == 404


def test_modeles_crud_flow(client):
    create_response = client.post(
        "/modeles/",
        json={"marque_id": 1, "nom": "Clio"},
    )

    assert create_response.status_code == 201
    modele_id = create_response.json()["id"]

    list_response = client.get("/modeles/")
    assert list_response.status_code == 200
    assert any(item["id"] == modele_id for item in list_response.json())

    get_response = client.get(f"/modeles/{modele_id}")
    assert get_response.status_code == 200
    assert get_response.json()["nom"] == "Clio"

    marque2_response = client.post("/marques/", json={"nom": "Peugeot"})
    assert marque2_response.status_code == 201
    marque2_id = marque2_response.json()["id"]

    update_response = client.put(
        f"/modeles/{modele_id}",
        json={"marque_id": marque2_id, "nom": "Megane"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["nom"] == "Megane"
    assert update_response.json()["marque_id"] == marque2_id

    delete_response = client.delete(f"/modeles/{modele_id}")
    assert delete_response.status_code == 204
    assert client.get(f"/modeles/{modele_id}").status_code == 404
