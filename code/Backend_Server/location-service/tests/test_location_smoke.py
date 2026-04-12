from tests.conftest import auth_headers


def test_root_returns_service_status(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "Location Service running"}


def test_list_locations_requires_authentication(client):
    response = client.get("/locations/")

    assert response.status_code == 403


def test_list_locations_with_auth_returns_empty_list(client):
    response = client.get("/locations/", headers=auth_headers(role="super_admin"))

    assert response.status_code == 200
    assert response.json() == []
