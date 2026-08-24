from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import Mesa, MesaStatus, Pedido, PedidoStatus
from app.schemas import ContaOut, PedidoOut

router = APIRouter(prefix="/api/v1/conta", tags=["conta"])


def _mesa_por_token(db: Session, token: str) -> Mesa:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return mesa


@router.get("/mesa/{token}")
def ver_conta(token: str, db: Session = Depends(get_db)):
    """Conta pública da mesa (cliente) com breakdown por modo/cliente."""
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
    total = sum(p.preco_centavos * p.quantidade for p in itens)
    por_modo: dict[str, int] = defaultdict(int)
    por_cliente: dict[str, int] = defaultdict(int)
    for p in itens:
        valor = p.preco_centavos * p.quantidade
        modo = p.modo.value if hasattr(p.modo, "value") else str(p.modo)
        por_modo[modo] += valor
        chave = p.cliente_nome or ("coletivo" if modo == "coletivo" else "sem_nome")
        por_cliente[chave] += valor
    return {
        "mesa_id": mesa.id,
        "mesa_nome": mesa.nome,
        "status": mesa.status.value if hasattr(mesa.status, "value") else str(mesa.status),
        "total_centavos": total,
        "itens": [PedidoOut.model_validate(p) for p in itens],
        "por_modo": dict(por_modo),
        "por_cliente": dict(por_cliente),
    }


@router.post("/mesa/{token}/fechar")
def fechar_conta(
    token: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    mesa = _mesa_por_token(db, token)
    itens = (
        db.query(Pedido)
        .filter(Pedido.mesa_id == mesa.id, Pedido.status != PedidoStatus.cancelado)
        .all()
    )
    for p in itens:
        if p.status != PedidoStatus.entregue:
            p.status = PedidoStatus.entregue
    mesa.status = MesaStatus.fechada
    db.commit()
    return {"ok": True, "status": "fechada", "mesa_id": mesa.id}
