from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_dono, require_estabelecimento
from app.database import get_db
from app.models import (
    Mesa,
    Pedido,
    TransferenciaSolicitacao,
    TransferenciaStatus,
)
from app.schemas import TransferenciaCreate, TransferenciaOut
from app.services_conta import validar_posicoes

router = APIRouter(prefix="/api/v1/transferencias", tags=["transferencias"])


@router.get("", response_model=list[TransferenciaOut])
def listar(
    status_filtro: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[TransferenciaSolicitacao]:
    q = db.query(TransferenciaSolicitacao).order_by(TransferenciaSolicitacao.id.desc())
    if status_filtro:
        try:
            q = q.filter(TransferenciaSolicitacao.status == TransferenciaStatus(status_filtro))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Status inválido.") from exc
    return q.limit(100).all()


@router.post("", response_model=TransferenciaOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: TransferenciaCreate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
) -> TransferenciaSolicitacao:
    origem = db.get(Mesa, body.mesa_origem_id)
    destino = db.get(Mesa, body.mesa_destino_id)
    if not origem or not destino:
        raise HTTPException(status_code=404, detail="Mesa origem/destino não encontrada.")

    pedidos = db.query(Pedido).filter(Pedido.id.in_(body.pedido_ids)).all()
    if len(pedidos) != len(set(body.pedido_ids)):
        raise HTTPException(status_code=400, detail="Um ou mais pedidos não existem.")
    for p in pedidos:
        if p.quitado:
            raise HTTPException(status_code=400, detail="Não é possível transferir pedido quitado.")
        if p.mesa_id != origem.id:
            raise HTTPException(status_code=400, detail="Pedido não pertence à mesa origem.")

    if body.posicoes_destino:
        try:
            validar_posicoes(body.posicoes_destino, destino.capacidade)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    row = TransferenciaSolicitacao(
        mesa_origem_id=origem.id,
        mesa_destino_id=destino.id,
        pedido_ids=list(body.pedido_ids),
        posicoes_origem=body.posicoes_origem,
        posicoes_destino=body.posicoes_destino,
        status=TransferenciaStatus.pending,
        solicitante_papel=body.solicitante_papel,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/{transferencia_id}/aprovar", response_model=TransferenciaOut)
def aprovar(
    transferencia_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_dono),
) -> TransferenciaSolicitacao:
    row = db.get(TransferenciaSolicitacao, transferencia_id)
    if not row:
        raise HTTPException(status_code=404, detail="Transferência não encontrada.")
    if row.status != TransferenciaStatus.pending:
        raise HTTPException(status_code=400, detail="Transferência já resolvida.")

    pedidos = db.query(Pedido).filter(Pedido.id.in_(row.pedido_ids or [])).all()
    for p in pedidos:
        if p.quitado:
            continue
        p.mesa_id = row.mesa_destino_id
        if row.posicoes_destino is not None:
            p.posicoes = list(row.posicoes_destino)

    row.status = TransferenciaStatus.approved
    row.aprovador_id = user.user_id
    row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


@router.post("/{transferencia_id}/rejeitar", response_model=TransferenciaOut)
def rejeitar(
    transferencia_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_dono),
) -> TransferenciaSolicitacao:
    row = db.get(TransferenciaSolicitacao, transferencia_id)
    if not row:
        raise HTTPException(status_code=404, detail="Transferência não encontrada.")
    if row.status != TransferenciaStatus.pending:
        raise HTTPException(status_code=400, detail="Transferência já resolvida.")
    row.status = TransferenciaStatus.rejected
    row.aprovador_id = user.user_id
    row.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row
