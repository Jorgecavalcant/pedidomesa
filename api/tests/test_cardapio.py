from __future__ import annotations


def test_seed_cardapio(client):
    r = client.get("/api/v1/cardapio")
    assert r.status_code == 200
    itens = r.json()
    assert len(itens) >= 4
    assert all(i["ativo"] for i in itens)


def test_crud_admin(client, auth_header):
    r = client.post(
        "/api/v1/cardapio",
        headers=auth_header,
        json={"nome": "Teste Item", "descricao": None, "preco_centavos": 999},
    )
    assert r.status_code == 201
    item = r.json()

    r = client.get("/api/v1/cardapio/admin", headers=auth_header)
    assert any(i["id"] == item["id"] for i in r.json())

    r = client.patch(
        f"/api/v1/cardapio/{item['id']}",
        headers=auth_header,
        json={"preco_centavos": 1500},
    )
    assert r.json()["preco_centavos"] == 1500

    r = client.delete(f"/api/v1/cardapio/{item['id']}", headers=auth_header)
    assert r.json()["ativo"] is False

    # soft-desativado some do público mas segue no admin
    r = client.get("/api/v1/cardapio")
    assert all(i["id"] != item["id"] for i in r.json())
    r = client.get("/api/v1/cardapio/admin", headers=auth_header)
    assert any(i["id"] == item["id"] and not i["ativo"] for i in r.json())


def test_auth_obrigatorio(client):
    assert (
        client.post(
            "/api/v1/cardapio", json={"nome": "x", "preco_centavos": 100}
        ).status_code
        == 401
    )


def test_pedido_via_cardapio_item_id(client, auth_header):
    item = client.post(
        "/api/v1/cardapio",
        headers=auth_header,
        json={"nome": "Petisco X", "descricao": None, "preco_centavos": 2500},
    ).json()
    mesa = client.post(
        "/api/v1/mesas", headers=auth_header, json={"nome": "Mesa 1"}
    ).json()

    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": mesa["qr_token"],
            "cardapio_item_id": item["id"],
            "nome_item": "TENTATIVA DE PREÇO LIVRE",
            "preco_centavos": 1,
            "quantidade": 2,
            "modo": "individual",
            "cliente_nome": "Zé",
        },
    )
    assert r.status_code == 201
    pedido = r.json()
    assert pedido["nome_item"] == "Petisco X"
    assert pedido["preco_centavos"] == 2500
    assert pedido["cardapio_item_id"] == item["id"]

    # item inativo rejeitado
    client.delete(f"/api/v1/cardapio/{item['id']}", headers=auth_header)
    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": mesa["qr_token"],
            "cardapio_item_id": item["id"],
            "modo": "individual",
            "cliente_nome": "Zé",
        },
    )
    assert r.status_code == 400


def test_payments_providers_plugavel_sem_asaas(client):
    """Pagamentos plugáveis: lista providers; Asaas não é core."""
    r = client.get("/api/v1/payments/providers")
    assert r.status_code == 200
    assert "manual" in r.json()["providers"]
    assert "asaas" not in r.json()["providers"]

    r = client.post(
        "/api/v1/payments/charge",
        json={"provider": "asaas", "valor_centavos": 100},
    )
    assert r.status_code in (400, 422)
