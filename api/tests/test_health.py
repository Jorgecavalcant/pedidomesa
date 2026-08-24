def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health_api(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
