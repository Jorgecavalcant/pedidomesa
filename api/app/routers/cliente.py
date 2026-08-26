from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.lgpd_utils import celular_ult4, hash_device_token, normalize_e164
from app.models import (
    ClienteMesaSessao,
    EstabelecimentoSettings,
    Mesa,
    MesaStatus,
    Pedido,
    PedidoStatus,
)
from app.schemas import (
    ClienteReentrarIn,
    ClienteSessaoIn,
    ClienteSessaoOut,
    PedidoOut,
)
from app.services_conta import validar_posicoes

router = APIRouter(prefix="/api/v1/cliente", tags=["cliente"])

ATIVOS = {
    PedidoStatus.pendente,
    PedidoStatus.preparando,
    PedidoStatus.pronto,
    PedidoStatus.entregue,
}


def _settings(db: Session) -> EstabelecimentoSettings:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    if row:
        return row
    row = EstabelecimentoSettings()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _mesa_por_token(db: Session, token: str) -> Mesa:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return mesa


@router.post(
    "/mesa/{token}/sessao",
    response_model=ClienteSessaoOut,
    status_code=status.HTTP_201_CREATED,
)
def criar_sessao(
    token: str,
    body: ClienteSessaoIn,
    db: Session = Depends(get_db),
) -> ClienteMesaSessao:
    mesa = _mesa_por_token(db, token)
    if mesa.status == MesaStatus.fechada:
        raise HTTPException(
            status_code=400,
            detail="Esta mesa está fechada. Peça ao balcão para reabrir.",
        )
    if not body.consent_aceito:
        raise HTTPException(
            status_code=400,
            detail="É necessário aceitar o aviso de privacidade para continuar.",
        )

    try:
        e164 = normalize_e164(body.celular)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    try:
        posicoes = validar_posicoes(body.posicoes, mesa.capacidade)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    cfg = _settings(db)
    versao = body.consent_texto_versao or cfg.lgpd_texto_versao

    sessao = ClienteMesaSessao(
        mesa_id=mesa.id,
        nome=body.nome.strip(),
        celular_e164=e164,
        celular_ult4=celular_ult4(e164),
        consent_aceito=True,
        consent_texto_versao=versao,
        consent_at=datetime.now(timezone.utc),
        device_token_hash=hash_device_token(body.device_token),
        posicoes=posicoes or None,
        ativa=True,
    )
    if mesa.status == MesaStatus.livre:
        mesa.status = MesaStatus.ocupada
    db.add(sessao)
    db.commit()
    db.refresh(sessao)
    return sessao


@router.post("/reentrar", response_model=ClienteSessaoOut)
def reentrar(body: ClienteReentrarIn, db: Session = Depends(get_db)) -> ClienteMesaSessao:
    try:
        e164 = normalize_e164(body.celular)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    token_hash = hash_device_token(body.device_token)
    q = db.query(ClienteMesaSessao).filter(
        ClienteMesaSessao.celular_e164 == e164,
        ClienteMesaSessao.device_token_hash == token_hash,
        ClienteMesaSessao.ativa.is_(True),
    )
    if body.mesa_token:
        mesa = _mesa_por_token(db, body.mesa_token)
        if mesa.status == MesaStatus.fechada:
            raise HTTPException(
                status_code=400,
                detail="Esta mesa está fechada.",
            )
        q = q.filter(ClienteMesaSessao.mesa_id == mesa.id)

    sessao = q.order_by(ClienteMesaSessao.id.desc()).first()
    if not sessao:
        raise HTTPException(
            status_code=404,
            detail="Sessão não encontrada. Identifique-se novamente na mesa.",
        )
    mesa = db.get(Mesa, sessao.mesa_id)
    if mesa and mesa.status == MesaStatus.fechada:
        raise HTTPException(status_code=400, detail="Esta mesa está fechada.")
    return sessao


@router.get("/mesa/{token}/meus-pedidos", response_model=list[PedidoOut])
def meus_pedidos(
    token: str,
    db: Session = Depends(get_db),
    x_device_token: str | None = Header(default=None, alias="X-Device-Token"),
) -> list[Pedido]:
    if not x_device_token:
        raise HTTPException(
            status_code=401,
            detail="Informe o cabeçalho X-Device-Token.",
        )
    mesa = _mesa_por_token(db, token)
    token_hash = hash_device_token(x_device_token)
    sessao = (
        db.query(ClienteMesaSessao)
        .filter(
            ClienteMesaSessao.mesa_id == mesa.id,
            ClienteMesaSessao.device_token_hash == token_hash,
            ClienteMesaSessao.ativa.is_(True),
        )
        .order_by(ClienteMesaSessao.id.desc())
        .first()
    )
    if not sessao:
        raise HTTPException(
            status_code=404,
            detail="Sessão não encontrada para este aparelho.",
        )
    return (
        db.query(Pedido)
        .filter(
            Pedido.mesa_id == mesa.id,
            Pedido.cliente_sessao_id == sessao.id,
            Pedido.status.in_(ATIVOS),
        )
        .order_by(Pedido.id)
        .all()
    )
