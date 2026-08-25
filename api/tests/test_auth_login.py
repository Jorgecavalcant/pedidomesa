def test_login_success(client):
    r = client.post(
        "/api/v1/auth/login", json={"usuario": "demo", "senha": "demo123"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["papel"] == "dono"


def test_login_invalid(client):
    r = client.post(
        "/api/v1/auth/login", json={"usuario": "demo", "senha": "errada"}
    )
    assert r.status_code == 401


def test_me_and_logout(client, auth_header):
    r = client.get("/api/v1/auth/me", headers=auth_header)
    assert r.status_code == 200
    me = r.json()
    assert me["usuario"] == "demo"
    assert me["papel"] == "dono"
    assert me["estabelecimento_nome"]

    r = client.post("/api/v1/auth/logout", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_me_requires_auth(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_usa_nome_do_settings_db(client, auth_header):
    client.patch(
        "/api/v1/settings",
        headers=auth_header,
        json={"nome_estabelecimento": "Boteco do Zé"},
    )
    r = client.get("/api/v1/auth/me", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["estabelecimento_nome"] == "Boteco do Zé"


def test_demo_compat(client):
    r = client.post(
        "/api/v1/auth/demo", json={"usuario": "demo", "senha": "demo123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]
