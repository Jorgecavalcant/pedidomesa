def test_metricas_requires_auth(client):
    assert client.get("/api/v1/metricas").status_code == 401


def test_metricas_ok(client, auth_header):
    r = client.get("/api/v1/metricas", headers=auth_header)
    assert r.status_code == 200
    body = r.json()
    for key in (
        "data_ref",
        "mesas_abertas",
        "pedidos_pendentes",
        "ticket_medio_centavos",
        "faturamento_hoje_centavos",
        "tempo_medio_preparo_segundos",
    ):
        assert key in body
    assert len(body["data_ref"]) == 10
    assert body["mesas_abertas"] >= 0
    assert body["faturamento_hoje_centavos"] >= 0
