"""Helpers compartilhados de conta / saldo / taxa."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import EstabelecimentoSettings, Pedido, PedidoStatus


def pedido_posicoes(p: Pedido) -> list[int]:
    raw = p.posicoes
    if raw is None:
        return []
    return list(raw)


def valor_pedido(p: Pedido) -> int:
    return int(p.preco_centavos) * int(p.quantidade)


def pedidos_abertos(db: Session, mesa_id: int) -> list[Pedido]:
    return (
        db.query(Pedido)
        .filter(
            Pedido.mesa_id == mesa_id,
            Pedido.status != PedidoStatus.cancelado,
            Pedido.quitado.is_(False),
        )
        .order_by(Pedido.id)
        .all()
    )


def saldo_aberto_centavos(db: Session, mesa_id: int) -> int:
    return sum(valor_pedido(p) for p in pedidos_abertos(db, mesa_id))


def taxa_bps_settings(db: Session) -> int:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    if row is None:
        return 1000
    return int(row.taxa_servico_bps)


def calc_taxa_centavos(subtotal: int, bps: int) -> int:
    """floor(subtotal * bps / 10000) conforme SPEC."""
    return (subtotal * bps) // 10000


def selecionar_pedidos_fechamento(
    candidatos: list[Pedido],
    escopo: str,
    posicoes: list[int] | None,
    pedido_ids: list[int] | None,
) -> list[Pedido]:
    if escopo == "mesa":
        return list(candidatos)
    if escopo == "itens":
        ids = set(pedido_ids or [])
        return [p for p in candidatos if p.id in ids]
    if escopo == "posicoes":
        alvo = set(posicoes or [])
        out: list[Pedido] = []
        for p in candidatos:
            pos = pedido_posicoes(p)
            # coletivo (vazio) NÃO entra em escopo posicoes
            if not pos:
                continue
            if alvo.intersection(pos):
                out.append(p)
        return out
    return []


def validar_posicoes(posicoes: list[int] | None, capacidade: int) -> list[int]:
    if not posicoes:
        return []
    for n in posicoes:
        if not isinstance(n, int) or n < 1 or n > capacidade:
            raise ValueError(f"Posição inválida: {n}. Use 1..{capacidade}.")
    return list(dict.fromkeys(posicoes))  # unique preserve order
