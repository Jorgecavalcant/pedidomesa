"""Testes F1 — capacidade, posições, fechamento parcial+taxa, liberar, LGPD."""


def _mesa(client, auth_header, nome="M1", capacidade=4, setor=None):
    body = {"nome": nome, "capacidade": capacidade}
    if setor is not None:
        body["setor"] = setor
    r = client.post("/api/v1/mesas", json=body, headers=auth_header)
    assert r.status_code == 201, r.text
    return r.json()


def _pedido(client, token, nome, preco, posicoes=None, modo="coletivo", cliente_nome=None):
    body = {
        "mesa_token": token,
        "nome_item": nome,
        "quantidade": 1,
        "preco_centavos": preco,
        "modo": modo,
    }
    if posicoes is not None:
        body["posicoes"] = posicoes
    if cliente_nome:
        body["cliente_nome"] = cliente_nome
        body["modo"] = "individual"
    r = client.post("/api/v1/pedidos", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_mesa_capacidade_default_e_filtro(client, auth_header):
    m = _mesa(client, auth_header, capacidade=6, setor="varanda")
    assert m["capacidade"] == 6
    assert m["setor"] == "varanda"

    bare = client.post("/api/v1/mesas", json={"nome": "Default"}, headers=auth_header)
    assert bare.status_code == 201
    assert bare.json()["capacidade"] == 4

    r = client.get("/api/v1/mesas?setor=varanda", headers=auth_header)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == m["id"]

    r = client.patch(
        f"/api/v1/mesas/{m['id']}",
        json={"capacidade": 8},
        headers=auth_header,
    )
    assert r.status_code == 200
    assert r.json()["capacidade"] == 8


def test_pedido_posicoes_validacao_e_patch(client, auth_header):
    m = _mesa(client, auth_header, capacidade=4)
    token = m["qr_token"]

    bad = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "X",
            "quantidade": 1,
            "preco_centavos": 1000,
            "modo": "coletivo",
            "posicoes": [1, 5],
        },
    )
    assert bad.status_code == 422

    p = _pedido(client, token, "Cerveja", 1200, posicoes=[1, 2])
    assert p["posicoes"] == [1, 2]
    assert p["quitado"] is False

    r = client.patch(
        f"/api/v1/pedidos/{p['id']}/posicoes",
        json={"posicoes": [3]},
        headers=auth_header,
    )
    assert r.status_code == 200
    assert r.json()["posicoes"] == [3]

    r = client.get("/api/v1/pedidos?quitado=false", headers=auth_header)
    assert r.status_code == 200
    assert any(x["id"] == p["id"] for x in r.json())


def test_fechar_parcial_taxa_e_liberar(client, auth_header):
    m = _mesa(client, auth_header, capacidade=4)
    token = m["qr_token"]
    p1 = _pedido(client, token, "Item1", 1000, posicoes=[1])
    p2 = _pedido(client, token, "Item2", 2000, posicoes=[2])

    conta = client.get(f"/api/v1/conta/mesa/{token}").json()
    assert conta["saldo_aberto_centavos"] == 3000
    assert conta["taxa_bps"] == 1000
    assert "1" in conta["por_posicao"] or 1 in conta.get("por_posicao", {})

    # Liberar bloqueado com saldo aberto
    lib = client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    assert lib.status_code == 409

    # Fecha só posição 1 + taxa 10%
    r = client.post(
        f"/api/v1/conta/mesa/{token}/fechar",
        headers=auth_header,
        json={"escopo": "posicoes", "posicoes": [1], "aplicar_taxa": True},
    )
    assert r.status_code == 200, r.text
    fech = r.json()
    assert fech["subtotal_centavos"] == 1000
    assert fech["taxa_centavos"] == 100  # floor(1000*1000/10000)
    assert fech["total_centavos"] == 1100
    assert fech["mesa_saldo_aberto_centavos"] == 2000
    assert fech["mesa_status"] == "ocupada"
    assert fech["fechamento_id"]

    # p1 quitado; p2 aberto; coletivo não entra em escopo posicoes
    ped = client.get(f"/api/v1/pedidos/{p1['id']}", headers=auth_header)
    # sem GET por id — lista quitado
    quitados = client.get("/api/v1/pedidos?quitado=true", headers=auth_header).json()
    assert any(x["id"] == p1["id"] for x in quitados)
    abertos = client.get("/api/v1/pedidos?quitado=false", headers=auth_header).json()
    assert any(x["id"] == p2["id"] for x in abertos)

    # Patch posicoes em quitado deve falhar
    r = client.patch(
        f"/api/v1/pedidos/{p1['id']}/posicoes",
        json={"posicoes": [4]},
        headers=auth_header,
    )
    assert r.status_code == 400

    # Fecha resto (mesa) → saldo 0 → fechada
    r = client.post(
        f"/api/v1/conta/mesa/{token}/fechar",
        headers=auth_header,
        json={"escopo": "mesa", "aplicar_taxa": False},
    )
    assert r.status_code == 200
    assert r.json()["mesa_saldo_aberto_centavos"] == 0
    assert r.json()["mesa_status"] == "fechada"
    assert r.json()["taxa_centavos"] == 0
    assert r.json()["total_centavos"] == 2000

    # Liberar → livre
    r = client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "livre"


def test_sessao_lgpd_e_reentrar(client, auth_header):
    m = _mesa(client, auth_header)
    token = m["qr_token"]
    device = "device-token-abc-12345"

    # Sem consent → 400
    r = client.post(
        f"/api/v1/cliente/mesa/{token}/sessao",
        json={
            "nome": "Ana",
            "celular": "+5511999998888",
            "consent_aceito": False,
            "device_token": device,
        },
    )
    assert r.status_code == 400

    r = client.post(
        f"/api/v1/cliente/mesa/{token}/sessao",
        json={
            "nome": "Ana",
            "celular_e164": "+5511999998888",
            "consent_aceito": True,
            "device_token": device,
            "posicoes": [1, 2],
        },
    )
    assert r.status_code == 201, r.text
    sessao = r.json()
    assert sessao["ativa"] is True
    assert sessao["celular_ult4"] == "8888"
    assert sessao["posicoes"] == [1, 2]
    assert "celular_e164" not in sessao

    # Reentrar
    r = client.post(
        "/api/v1/cliente/reentrar",
        json={
            "celular": "+5511999998888",
            "device_token": device,
            "mesa_token": token,
        },
    )
    assert r.status_code == 200
    assert r.json()["id"] == sessao["id"]

    # Pedido vinculado à sessão
    ped = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Drink",
            "quantidade": 1,
            "preco_centavos": 1800,
            "modo": "individual",
            "cliente_nome": "Ana",
            "posicoes": [1],
            "cliente_sessao_id": sessao["id"],
        },
    )
    assert ped.status_code == 201

    meus = client.get(
        f"/api/v1/cliente/mesa/{token}/meus-pedidos",
        headers={"X-Device-Token": device},
    )
    assert meus.status_code == 200
    assert len(meus.json()) == 1

    # Settings taxa/lgpd
    r = client.patch(
        "/api/v1/settings",
        headers=auth_header,
        json={"taxa_servico_bps": 500, "lgpd_texto_versao": "v2-test"},
    )
    assert r.status_code == 200
    assert r.json()["taxa_servico_bps"] == 500
    assert r.json()["lgpd_texto_versao"] == "v2-test"

    # Após fechar tudo e liberar, sessão inativa — reentrar falha
    client.post(f"/api/v1/conta/mesa/{token}/fechar", headers=auth_header)
    client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    r = client.post(
        "/api/v1/cliente/reentrar",
        json={"celular": "+5511999998888", "device_token": device, "mesa_token": token},
    )
    assert r.status_code in (400, 404)


def test_solicitacoes_crud_minimo(client, auth_header):
    m = _mesa(client, auth_header)
    p = _pedido(client, m["qr_token"], "X", 500)
    r = client.post(
        "/api/v1/solicitacoes",
        headers=auth_header,
        json={"tipo": "cancelar_pedido", "pedido_id": p["id"], "payload": {"motivo": "erro"}},
    )
    assert r.status_code == 201, r.text
    sol = r.json()
    assert sol["status"] == "pending"

    r = client.post(f"/api/v1/solicitacoes/{sol['id']}/aprovar", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "approved"
