def _criar_mesa(client, auth_header):
    r = client.post("/api/v1/mesas", json={"nome": "Mesa A"}, headers=auth_header)
    assert r.status_code == 201
    return r.json()


SUBTOTAL = 2 * 1200 + 3500  # 5900
TAXA = SUBTOTAL * 1000 // 10000  # 590 (floor, bps default 1000)
TOTAL = SUBTOTAL + TAXA  # 6490


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
    assert conta["total_centavos"] == SUBTOTAL

    r = client.post(f"/api/v1/conta/mesa/{token}/fechar", headers=auth_header)
    assert r.status_code == 200
    fechada = r.json()
    assert fechada["status"] == "fechada"
    assert fechada["mesa_status"] == "fechada"
    # taxa de serviço 10% (1000 bps, floor): 5900 * 1000 // 10000 = 590
    assert fechada["taxa_centavos"] == TAXA
    assert fechada["subtotal_centavos"] == SUBTOTAL
    assert fechada["total_centavos"] == TOTAL
    assert fechada["mensagem_conta"]

    # mesa fechada → novo pedido bloqueado
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


def test_reabrir_mesa(client, auth_header):
    mesa = client.post("/api/v1/mesas", headers=auth_header, json={"nome": "R1"}).json()
    token = mesa["qr_token"]
    client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Item",
            "preco_centavos": 1000,
            "quantidade": 1,
            "modo": "coletivo",
        },
    )
    r = client.post(f"/api/v1/conta/mesa/{token}/fechar", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["total_centavos"] == 1100  # 1000 + taxa 10% (100)
    r = client.post(f"/api/v1/mesas/{mesa['id']}/reabrir", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "livre"
    # nova mesa fechada só reabre se fechada
    livre = client.post("/api/v1/mesas", headers=auth_header, json={"nome": "R2"}).json()
    assert client.post(f"/api/v1/mesas/{livre['id']}/reabrir", headers=auth_header).status_code == 400
