from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import Mesa, MesaStatus, Pedido, PedidoStatus
from app.schemas import MetricasOut

router = APIRouter(prefix="/api/v1/metricas", tags=["metricas"])

# America/Sao_Paulo fixo (UTC-3) — sem DST no Brasil desde 2019
TZ_SP = timezone(timedelta(hours=-3))


@router.get("", response_model=MetricasOut)
def get_metricas(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> MetricasOut:
    """Faturamento do dia = soma (preço*qtd) de pedidos não cancelados criados hoje (SP)."""
    agora = datetime.now(TZ_SP)
    data_ref = agora.strftime("%Y-%m-%d")
    inicio_hoje = datetime(agora.year, agora.month, agora.day, tzinfo=TZ_SP)

    mesas_abertas = (
        db.query(func.count(Mesa.id))
        .filter(Mesa.status.in_([MesaStatus.livre, MesaStatus.ocupada]))
        .scalar()
        or 0
    )

    pedidos_pendentes = (
        db.query(func.count(Pedido.id))
        .filter(Pedido.status.in_([PedidoStatus.pendente, PedidoStatus.preparando]))
        .scalar()
        or 0
    )

    # SQLite pode comparar naive; normaliza filtro
    inicio_naive = inicio_hoje.replace(tzinfo=None)

    faturamento = (
        db.query(func.coalesce(func.sum(Pedido.preco_centavos * Pedido.quantidade), 0))
        .filter(
            Pedido.created_at >= inicio_naive,
            Pedido.status != PedidoStatus.cancelado,
        )
        .scalar()
        or 0
    )

    mesas_com_pedidos = (
        db.query(func.count(func.distinct(Pedido.mesa_id)))
        .filter(
            Pedido.created_at >= inicio_naive,
            Pedido.status != PedidoStatus.cancelado,
        )
        .scalar()
        or 0
    )
    ticket = int(faturamento // mesas_com_pedidos) if mesas_com_pedidos else 0

    return MetricasOut(
        data_ref=data_ref,
        mesas_abertas=int(mesas_abertas),
        pedidos_pendentes=int(pedidos_pendentes),
        ticket_medio_centavos=ticket,
        faturamento_hoje_centavos=int(faturamento),
        tempo_medio_preparo_segundos=None,
    )
