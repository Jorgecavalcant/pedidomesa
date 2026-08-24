from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import Mesa, MesaStatus, Pedido, PedidoStatus
from app.schemas import ContaOut, PedidoOut

router = APIRouter(prefix="/api/v1/conta", tags=["conta"])

CONTABILIZA = {
    PedidoStatus.pendente,
    PedidoStatus.preparando,
    PedidoStatus.pronto,
    PedidoStatus.entregue,
}


def _conta(mesa: Mesa, db: Session) -> ContaOut:
    itens = (
        db.query(Pedido)
        .filter(Pedido.mesa_id == mesa.id, Pedido.status.in_(CONTABILIZA))
        .order_by(Pedido.id)
        .all()
    )
    total = sum(i.preco_centavos * i.quantidade for i in itens)
    return ContaOut(
        mesa_id=mesa.id,
        mesa_nome=mesa.nome,
        status=mesa.status.value,
        total_centavos=total,
        itens=[PedidoOut.model_validate(i) for i in itens],
    )


@router.get("/mesa/{token}", response_model=ContaOut)
def ver_conta(
    token: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> ContaOut:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return _conta(mesa, db)


@router.post("/mesa/{token}/fechar", response_model=ContaOut)
def fechar_conta(
    token: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> ContaOut:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    conta = _conta(mesa, db)
    for item in (
        db.query(Pedido)
        .filter(Pedido.mesa_id == mesa.id, Pedido.status != PedidoStatus.cancelado)
        .all()
    ):
        item.status = PedidoStatus.entregue
    mesa.status = MesaStatus.fechada
    db.commit()
    db.refresh(mesa)
    return ContaOut(
        mesa_id=conta.mesa_id,
        mesa_nome=conta.mesa_nome,
        status=mesa.status.value,
        total_centavos=conta.total_centavos,
        itens=conta.itens,
    )
