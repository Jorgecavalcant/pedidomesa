from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import (
    CardapioItem,
    ClienteMesaSessao,
    Mesa,
    MesaStatus,
    Pedido,
    PedidoModo,
    PedidoStatus,
)
from app.schemas import PedidoCreate, PedidoOut, PedidoPosicoesUpdate, PedidoStatusUpdate
from app.services_conta import validar_posicoes

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
    quitado: bool | None = Query(None),
    posicao: int | None = Query(None),
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
    if quitado is not None:
        q = q.filter(Pedido.quitado.is_(quitado))
    pedidos = q.limit(200).all()
    if posicao is not None:
        pedidos = [
            p
            for p in pedidos
            if p.posicoes and posicao in (p.posicoes or [])
        ]
    return pedidos[:100]


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

    try:
        posicoes = validar_posicoes(body.posicoes, mesa.capacidade)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    cliente_sessao_id: int | None = None
    if body.cliente_sessao_id is not None:
        sessao = db.get(ClienteMesaSessao, body.cliente_sessao_id)
        if (
            sessao is None
            or not sessao.ativa
            or sessao.mesa_id != mesa.id
        ):
            raise HTTPException(
                status_code=400,
                detail="Sessão do cliente inválida ou inativa nesta mesa.",
            )
        cliente_sessao_id = sessao.id

    cardapio_item_id: int | None = None
    if body.cardapio_item_id is not None:
        item = db.get(CardapioItem, body.cardapio_item_id)
        if not item or not item.ativo:
            raise HTTPException(
                status_code=400,
                detail="Item de cardápio inválido ou inativo.",
            )
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
        posicoes=posicoes,
        quitado=False,
        cliente_sessao_id=cliente_sessao_id,
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


@router.patch("/{pedido_id}/posicoes", response_model=PedidoOut)
def atualizar_posicoes(
    pedido_id: int,
    body: PedidoPosicoesUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Pedido:
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    if pedido.quitado:
        raise HTTPException(
            status_code=400,
            detail="Pedido já quitado — não é possível reatribuir posições.",
        )
    mesa = db.get(Mesa, pedido.mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    try:
        posicoes = validar_posicoes(body.posicoes, mesa.capacidade)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    pedido.posicoes = posicoes
    db.commit()
    db.refresh(pedido)
    return pedido
