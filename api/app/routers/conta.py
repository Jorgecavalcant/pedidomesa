from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_estabelecimento
from app.database import get_db
from app.models import (
    ClienteMesaSessao,
    EstabelecimentoSettings,
    Fechamento,
    FechamentoEscopo,
    Mesa,
    MesaStatus,
    Pedido,
    PedidoStatus,
)
from app.schemas import FecharContaIn, FecharContaOut, PedidoOut
from app.services_conta import (
    calc_taxa_centavos,
    pedido_posicoes,
    pedidos_abertos,
    saldo_aberto_centavos,
    selecionar_pedidos_fechamento,
    taxa_bps_settings,
    valor_pedido,
)

router = APIRouter(prefix="/api/v1/conta", tags=["conta"])


def _mesa_por_token(db: Session, token: str) -> Mesa:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return mesa


def _mensagem_conta(db: Session) -> str:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    return row.mensagem_conta if row else "Obrigado — volte sempre"


@router.get("/mesa/{token}")
def ver_conta(token: str, db: Session = Depends(get_db)):
    """Conta pública da mesa com breakdown por modo/cliente/posição + saldo."""
    mesa = _mesa_por_token(db, token)
    itens = (
        db.query(Pedido)
        .filter(
            Pedido.mesa_id == mesa.id,
            Pedido.status != PedidoStatus.cancelado,
        )
        .order_by(Pedido.id)
        .all()
    )
    total = sum(valor_pedido(p) for p in itens)
    por_modo: dict[str, int] = defaultdict(int)
    por_cliente: dict[str, int] = defaultdict(int)
    por_posicao: dict[str, int] = defaultdict(int)
    for p in itens:
        if p.quitado:
            continue
        valor = valor_pedido(p)
        modo = p.modo.value if hasattr(p.modo, "value") else str(p.modo)
        por_modo[modo] += valor
        chave = p.cliente_nome or ("coletivo" if modo == "coletivo" else "sem_nome")
        por_cliente[chave] += valor
        pos = pedido_posicoes(p)
        if not pos:
            por_posicao["coletivo"] += valor
        else:
            parte = valor // len(pos)
            resto = valor - parte * len(pos)
            for i, n in enumerate(pos):
                por_posicao[str(n)] += parte + (resto if i == 0 else 0)

    return {
        "mesa_id": mesa.id,
        "mesa_nome": mesa.nome,
        "status": mesa.status.value if hasattr(mesa.status, "value") else str(mesa.status),
        "total_centavos": total,
        "itens": [PedidoOut.model_validate(p) for p in itens],
        "por_modo": dict(por_modo),
        "por_cliente": dict(por_cliente),
        "por_posicao": dict(por_posicao),
        "saldo_aberto_centavos": saldo_aberto_centavos(db, mesa.id),
        "taxa_bps": taxa_bps_settings(db),
    }


@router.post("/mesa/{token}/fechar", response_model=FecharContaOut)
def fechar_conta(
    token: str,
    body: FecharContaIn | None = Body(default=None),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    """Fecha conta. Sem body = escopo mesa + taxa settings (compat soft)."""
    mesa = _mesa_por_token(db, token)
    payload = body if body is not None else FecharContaIn()

    if payload.escopo == "posicoes" and not payload.posicoes:
        raise HTTPException(status_code=422, detail="Informe posicoes para escopo posicoes.")
    if payload.escopo == "itens" and not payload.pedido_ids:
        raise HTTPException(status_code=422, detail="Informe pedido_ids para escopo itens.")

    candidatos = pedidos_abertos(db, mesa.id)
    selecionados = selecionar_pedidos_fechamento(
        candidatos, payload.escopo, payload.posicoes, payload.pedido_ids
    )
    if not selecionados and payload.escopo != "mesa":
        raise HTTPException(
            status_code=400,
            detail="Nenhum pedido aberto no escopo informado.",
        )

    subtotal = sum(valor_pedido(p) for p in selecionados)
    bps = taxa_bps_settings(db) if payload.aplicar_taxa else 0
    taxa = calc_taxa_centavos(subtotal, bps) if payload.aplicar_taxa else 0
    total = subtotal + taxa

    fechamento = Fechamento(
        mesa_id=mesa.id,
        escopo=FechamentoEscopo(payload.escopo),
        posicoes=list(payload.posicoes) if payload.posicoes else None,
        pedido_ids=list(payload.pedido_ids) if payload.pedido_ids else None,
        subtotal_centavos=subtotal,
        taxa_bps_aplicada=bps,
        taxa_centavos=taxa,
        total_centavos=total,
        pagamento_modo="manual",
        criado_por_user_id=user.user_id,
    )
    db.add(fechamento)
    db.flush()

    for p in selecionados:
        p.quitado = True
        p.fechamento_id = fechamento.id
        if p.status != PedidoStatus.entregue:
            p.status = PedidoStatus.entregue

    # SessionLocal usa autoflush=False — saldo em memória evita race com DB
    sel_ids = {p.id for p in selecionados}
    saldo = sum(valor_pedido(p) for p in candidatos if p.id not in sel_ids)
    if saldo == 0:
        mesa.status = MesaStatus.fechada
    elif mesa.status == MesaStatus.livre:
        mesa.status = MesaStatus.ocupada

    db.commit()
    db.refresh(fechamento)
    db.refresh(mesa)

    mesa_status = mesa.status.value if hasattr(mesa.status, "value") else str(mesa.status)
    return FecharContaOut(
        ok=True,
        fechamento_id=fechamento.id,
        escopo=payload.escopo,
        subtotal_centavos=subtotal,
        taxa_bps_aplicada=bps,
        taxa_centavos=taxa,
        total_centavos=total,
        mesa_saldo_aberto_centavos=saldo,
        saldo_restante_centavos=saldo,
        mesa_status=mesa_status,
        status=mesa_status,
        mesa_id=mesa.id,
        mesa_nome=mesa.nome,
        mensagem_conta=_mensagem_conta(db),
    )


@router.post("/mesa/{token}/liberar")
def liberar_mesa(
    token: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    """Libera mesa só se saldo aberto = 0; anonimiza/encerra sessões → status livre."""
    mesa = _mesa_por_token(db, token)
    saldo = saldo_aberto_centavos(db, mesa.id)
    if saldo > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Não é possível liberar: saldo aberto de {saldo} centavos.",
        )

    sessoes = (
        db.query(ClienteMesaSessao)
        .filter(ClienteMesaSessao.mesa_id == mesa.id, ClienteMesaSessao.ativa.is_(True))
        .all()
    )
    for s in sessoes:
        s.ativa = False
        s.nome = "anon"
        s.celular_e164 = f"+000000000{s.celular_ult4}"

    mesa.status = MesaStatus.livre
    db.commit()
    return {
        "ok": True,
        "mesa_id": mesa.id,
        "status": "livre",
        "sessoes_encerradas": len(sessoes),
        "mensagem_conta": _mensagem_conta(db),
    }
