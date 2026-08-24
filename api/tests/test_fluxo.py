def _criar_mesa(client, auth_header):
    r = client.post("/api/v1/mesas", json={"nome": "Mesa A"}, headers=auth_header)
    assert r.status_code == 201
    return r.json()


def test_fluxo_pedido_cozinha_conta(client, auth_header):
    mesa = _criar_mesa(client, auth_header)
    token = mesa["qr_token"]

    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Cerveja",
            "quantidade": 2,
            "preco_centavos": 1200,
            "modo": "individual",
            "cliente_nome": "Ana",
        },
    )
    assert r.status_code == 201
    ped1 = r.json()
    assert ped1["status"] == "pendente"

    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Porção batata",
            "quantidade": 1,
            "preco_centavos": 3500,
            "modo": "coletivo",
        },
    )
    assert r.status_code == 201

    r = client.get(f"/api/v1/pedidos/mesa/{token}")
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = client.get("/api/v1/cozinha/abertos", headers=auth_header)
    assert r.status_code == 200
    assert len(r.json()) == 2

    r = client.post(f"/api/v1/cozinha/pedidos/{ped1['id']}/pronto", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "pronto"

    r = client.get(f"/api/v1/conta/mesa/{token}", headers=auth_header)
    assert r.status_code == 200
    conta = r.json()
    assert conta["total_centavos"] == 2 * 1200 + 3500

    r = client.post(f"/api/v1/conta/mesa/{token}/fechar", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "fechada"

    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Água",
            "quantidade": 1,
            "preco_centavos": 500,
            "modo": "coletivo",
        },
    )
    assert r.status_code == 400


def test_individual_sem_nome(client, auth_header):
    mesa = _criar_mesa(client, auth_header)
    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": mesa["qr_token"],
            "nome_item": "Drink",
            "quantidade": 1,
            "preco_centavos": 2000,
            "modo": "individual",
        },
    )
    assert r.status_code == 422
