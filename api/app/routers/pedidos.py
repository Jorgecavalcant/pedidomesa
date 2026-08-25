from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import (
    CardapioItem,
    Mesa,
    MesaStatus,
    Pedido,
    PedidoModo,
    PedidoStatus,
)
from app.schemas import PedidoCreate, PedidoOut, PedidoStatusUpdate

router = APIRouter(prefix="/api/v1/pedidos", tags=["pedidos"])

ATIVOS = {
    PedidoStatus.pendente,
    PedidoStatus.preparando,
    PedidoStatus.pronto,
    PedidoStatus.entregue,
}


@router.get("", response_model=list[PedidoOut])
def listar_pedidos(
    status_filtro: str | None = Query(None, alias="status"),
    mesa_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[Pedido]:
    q = db.query(Pedido).order_by(Pedido.created_at.desc(), Pedido.id.desc())
    if status_filtro:
        try:
            q = q.filter(Pedido.status == PedidoStatus(status_filtro))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Status inválido.") from exc
    if mesa_id is not None:
        q = q.filter(Pedido.mesa_id == mesa_id)
    return q.limit(100).all()


@router.post("", response_model=PedidoOut, status_code=status.HTTP_201_CREATED)
def criar_pedido(body: PedidoCreate, db: Session = Depends(get_db)) -> Pedido:
    mesa = db.query(Mesa).filter(Mesa.qr_token == body.mesa_token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    if mesa.status == MesaStatus.fechada:
        raise HTTPException(
            status_code=400,
            detail="Esta mesa está fechada. Peça ao balcão para reabrir.",
        )
    if body.modo == "individual" and not (body.cliente_nome or "").strip():
        raise HTTPException(
            status_code=422,
            detail="Informe seu nome para pedido individual.",
        )

    cardapio_item_id: int | None = None
    if body.cardapio_item_id is not None:
        item = db.get(CardapioItem, body.cardapio_item_id)
        if not item or not item.ativo:
            raise HTTPException(
                status_code=400,
                detail="Item de cardápio inválido ou inativo.",
            )
        # Preço/nome SEMPRE vêm do cardápio; valores livres do body são ignorados.
        nome_item = item.nome
        preco_centavos = item.preco_centavos
        cardapio_item_id = item.id
    else:
        if not body.nome_item or body.preco_centavos is None:
            raise HTTPException(
                status_code=422,
                detail="Informe cardapio_item_id ou nome_item + preco_centavos.",
            )
        nome_item = body.nome_item
        preco_centavos = body.preco_centavos

    pedido = Pedido(
        mesa_id=mesa.id,
        cardapio_item_id=cardapio_item_id,
        nome_item=nome_item,
        quantidade=body.quantidade,
        preco_centavos=preco_centavos,
        modo=PedidoModo(body.modo),
        cliente_nome=(body.cliente_nome or None),
        status=PedidoStatus.pendente,
    )
    if mesa.status == MesaStatus.livre:
        mesa.status = MesaStatus.ocupada
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


@router.get("/mesa/{token}", response_model=list[PedidoOut])
def listar_por_mesa(token: str, db: Session = Depends(get_db)) -> list[Pedido]:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return (
        db.query(Pedido)
        .filter(Pedido.mesa_id == mesa.id, Pedido.status.in_(ATIVOS))
        .order_by(Pedido.id)
        .all()
    )


@router.patch("/{pedido_id}/status", response_model=PedidoOut)
def atualizar_status(
    pedido_id: int,
    body: PedidoStatusUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Pedido:
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    pedido.status = PedidoStatus(body.status)
    db.commit()
    db.refresh(pedido)
    return pedido
