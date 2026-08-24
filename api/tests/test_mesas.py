def test_login_demo_ok(client):
    r = client.post("/api/v1/auth/demo", json={"usuario": "demo", "senha": "demo123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_demo_falha(client):
    r = client.post("/api/v1/auth/demo", json={"usuario": "demo", "senha": "errada"})
    assert r.status_code == 401


def test_mesas_crud(client, auth_header):
    r = client.post("/api/v1/mesas", json={"nome": "Mesa 1"}, headers=auth_header)
    assert r.status_code == 201
    mesa = r.json()
    assert mesa["nome"] == "Mesa 1"
    assert mesa["qr_token"]
    assert mesa["status"] == "livre"

    token = mesa["qr_token"]
    r = client.get(f"/api/v1/mesas/por-token/{token}")
    assert r.status_code == 200
    assert r.json()["nome"] == "Mesa 1"

    r = client.get("/api/v1/mesas", headers=auth_header)
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.patch(
        f"/api/v1/mesas/{mesa['id']}",
        json={"nome": "Mesa VIP"},
        headers=auth_header,
    )
    assert r.status_code == 200
    assert r.json()["nome"] == "Mesa VIP"

    r = client.delete(f"/api/v1/mesas/{mesa['id']}", headers=auth_header)
    assert r.status_code == 204


def test_mesas_sem_auth(client):
    r = client.get("/api/v1/mesas")
    assert r.status_code == 401
