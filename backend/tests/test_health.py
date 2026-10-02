from fastapi.testclient import TestClient

from prepare_backend.app import app


def test_health_contract() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["content-type"] == "application/json"


def test_unknown_route() -> None:
    with TestClient(app) as client:
        assert client.get("/api/missing").status_code == 404
