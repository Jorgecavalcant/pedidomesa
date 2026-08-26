"""FASE 1 — posições, fechamento parcial + taxa, liberar."""


def _criar_mesa(client, auth_header, capacidade=4, setor=None):
    body = {"nome": "Mesa Pos", "capacidade": capacidade}
    if setor is not None:
        body["setor"] = setor
    r = client.post("/api/v1/mesas", json=body, headers=auth_header)
    assert r.status_code == 201, r.text
    return r.json()


def _pedido(client, token, nome, preco, posicoes, cliente="Ana"):
    r = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": nome,
            "quantidade": 1,
            "preco_centavos": preco,
            "modo": "individual",
            "cliente_nome": cliente,
            "posicoes": posicoes,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_fechamento_parcial_posicao_com_taxa_10pct(client, auth_header):
    mesa = _criar_mesa(client, auth_header, capacidade=4)
    token = mesa["qr_token"]
    assert mesa["capacidade"] == 4

    # Settings default 1000 bps
    s = client.get("/api/v1/settings", headers=auth_header)
    assert s.status_code == 200
    assert s.json()["taxa_servico_bps"] == 1000

    p1 = _pedido(client, token, "Drink pos1", 10000, [1])
    p2 = _pedido(client, token, "Drink pos2", 5000, [2])

    conta = client.get(f"/api/v1/conta/mesa/{token}").json()
    assert conta["saldo_aberto_centavos"] == 15000
    assert "1" in conta["por_posicao"]
    assert "2" in conta["por_posicao"]

    r = client.post(
        f"/api/v1/conta/mesa/{token}/fechar",
        headers=auth_header,
        json={
            "escopo": "posicoes",
            "posicoes": [1],
            "aplicar_taxa": True,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subtotal_centavos"] == 10000
    assert body["taxa_bps_aplicada"] == 1000
    assert body["taxa_centavos"] == 1000  # floor(10000 * 1000 / 10000)
    assert body["total_centavos"] == 11000
    assert body["mesa_saldo_aberto_centavos"] == 5000
    assert body["mesa_status"] == "ocupada"
    assert body["fechamento_id"]

    # p1 quitado, p2 aberto
    pedidos = client.get(
        "/api/v1/pedidos", headers=auth_header, params={"mesa_id": mesa["id"]}
    ).json()
    by_id = {p["id"]: p for p in pedidos}
    assert by_id[p1["id"]]["quitado"] is True
    assert by_id[p2["id"]]["quitado"] is False

    # liberar bloqueado com saldo > 0
    lib = client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    assert lib.status_code == 409

    # fecha resto
    r2 = client.post(
        f"/api/v1/conta/mesa/{token}/fechar",
        headers=auth_header,
        json={"escopo": "posicoes", "posicoes": [2], "aplicar_taxa": False},
    )
    assert r2.status_code == 200
    assert r2.json()["mesa_saldo_aberto_centavos"] == 0
    assert r2.json()["mesa_status"] == "fechada"
    assert r2.json()["taxa_centavos"] == 0

    lib2 = client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    assert lib2.status_code == 200
    assert lib2.json()["status"] == "livre"


def test_liberar_bloqueado_se_saldo_positivo(client, auth_header):
    mesa = _criar_mesa(client, auth_header)
    token = mesa["qr_token"]
    _pedido(client, token, "Item", 2000, [1])
    r = client.post(f"/api/v1/conta/mesa/{token}/liberar", headers=auth_header)
    assert r.status_code == 409
    assert "saldo" in r.json()["detail"].lower()


def test_patch_posicoes_staff(client, auth_header):
    mesa = _criar_mesa(client, auth_header, capacidade=4)
    token = mesa["qr_token"]
    p = _pedido(client, token, "Item", 1000, [1])
    r = client.patch(
        f"/api/v1/pedidos/{p['id']}/posicoes",
        headers=auth_header,
        json={"posicoes": [3]},
    )
    assert r.status_code == 200
    assert r.json()["posicoes"] == [3]


def test_cliente_sessao_lgpd_e_meus_pedidos(client, auth_header):
    mesa = _criar_mesa(client, auth_header, capacidade=4)
    token = mesa["qr_token"]

    # sem consentimento
    r = client.post(
        f"/api/v1/cliente/mesa/{token}/sessao",
        json={
            "nome": "João",
            "celular": "11999998888",
            "consent_aceito": False,
            "device_token": "device-abc-12345",
            "posicoes": [1],
        },
    )
    assert r.status_code == 400

    r = client.post(
        f"/api/v1/cliente/mesa/{token}/sessao",
        json={
            "nome": "João",
            "celular": "11999998888",
            "consent_aceito": True,
            "device_token": "device-abc-12345",
            "posicoes": [1],
        },
    )
    assert r.status_code == 201, r.text
    sessao = r.json()
    assert sessao["celular_ult4"] == "8888"
    assert sessao["ativa"] is True

    p = client.post(
        "/api/v1/pedidos",
        json={
            "mesa_token": token,
            "nome_item": "Água",
            "preco_centavos": 500,
            "quantidade": 1,
            "modo": "individual",
            "cliente_nome": "João",
            "posicoes": [1],
            "cliente_sessao_id": sessao["id"],
        },
    )
    assert p.status_code == 201

    meus = client.get(
        f"/api/v1/cliente/mesa/{token}/meus-pedidos",
        headers={"X-Device-Token": "device-abc-12345"},
    )
    assert meus.status_code == 200
    assert len(meus.json()) == 1

    re = client.post(
        "/api/v1/cliente/reentrar",
        json={
            "celular": "11999998888",
            "device_token": "device-abc-12345",
            "mesa_token": token,
        },
    )
    assert re.status_code == 200
    assert re.json()["id"] == sessao["id"]


def test_solicitacao_garcom_dono_aprova(client, auth_header):
    from app.auth import issue_demo_token

    mesa = _criar_mesa(client, auth_header)
    token = mesa["qr_token"]
    p = _pedido(client, token, "Item", 1000, [1])

    garcom_h = {"Authorization": f"Bearer {issue_demo_token('garcom')}"}
    r = client.post(
        "/api/v1/solicitacoes",
        headers=garcom_h,
        json={"tipo": "cancelar_pedido", "pedido_id": p["id"], "payload": {"motivo": "erro"}},
    )
    assert r.status_code == 201, r.text
    sol_id = r.json()["id"]
    assert r.json()["status"] == "pending"

    # garcom não aprova
    assert (
        client.post(f"/api/v1/solicitacoes/{sol_id}/aprovar", headers=garcom_h).status_code
        == 403
    )

    r = client.post(f"/api/v1/solicitacoes/{sol_id}/aprovar", headers=auth_header)
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    ped = client.get("/api/v1/pedidos", headers=auth_header, params={"mesa_id": mesa["id"]})
    by_id = {x["id"]: x for x in ped.json()}
    assert by_id[p["id"]]["status"] == "cancelado"


def test_mesa_setor_filtro(client, auth_header):
    _criar_mesa(client, auth_header, setor="varanda")
    _criar_mesa(client, auth_header, setor="salao")
    r = client.get("/api/v1/mesas", headers=auth_header, params={"setor": "varanda"})
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["setor"] == "varanda"
