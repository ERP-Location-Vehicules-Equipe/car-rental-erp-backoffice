from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate():
    response = client.post("/api/reports/generate")
    assert response.status_code == 200


def test_dashboard():
    response = client.get("/api/reports/dashboard")
    assert response.status_code == 200