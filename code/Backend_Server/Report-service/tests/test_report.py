from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate():
    response = client.post("/reports/generate")
    assert response.status_code == 200

def test_dashboard():
    response = client.get("/reports/dashboard")
    assert response.status_code == 200