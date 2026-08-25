def test_settings_roundtrip(client, auth_header):
    r = client.get("/api/v1/settings", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["nome_estabelecimento"]

    r = client.patch(
        "/api/v1/settings",
        headers=auth_header,
        json={"nome_estabelecimento": "Boteco Tech", "mensagem_conta": "Valeu!"},
    )
    assert r.status_code == 200
    assert r.json()["nome_estabelecimento"] == "Boteco Tech"
    assert r.json()["mensagem_conta"] == "Valeu!"
