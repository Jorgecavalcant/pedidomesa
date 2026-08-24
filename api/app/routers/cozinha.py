from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import Pedido, PedidoStatus
from app.schemas import PedidoOut

router = APIRouter(prefix="/api/v1/cozinha", tags=["cozinha"])

ABERTOS = {PedidoStatus.pendente, PedidoStatus.preparando}


@router.get("/abertos", response_model=list[PedidoOut])
def listar_abertos(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[Pedido]:
    return (
        db.query(Pedido)
        .filter(Pedido.status.in_(ABERTOS))
        .order_by(Pedido.id)
        .all()
    )


@router.post("/pedidos/{pedido_id}/pronto", response_model=PedidoOut)
def marcar_pronto(
    pedido_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Pedido:
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")
    pedido.status = PedidoStatus.pronto
    db.commit()
    db.refresh(pedido)
    return pedido
