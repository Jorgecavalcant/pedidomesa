from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.config import get_settings
from app.database import get_db
from app.models import ClienteMesaSessao, EstabelecimentoSettings, Mesa, MesaStatus
from app.schemas import MesaCreate, MesaOut, MesaPublic, MesaUpdate
from app.services_conta import saldo_aberto_centavos

router = APIRouter(prefix="/api/v1/mesas", tags=["mesas"])


def _nome_estabelecimento(db: Session) -> str:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    if row and row.nome_estabelecimento:
        return row.nome_estabelecimento
    return get_settings().estabelecimento_nome


@router.get("", response_model=list[MesaOut])
def listar_mesas(
    status_filtro: str | None = Query(None, alias="status"),
    setor: str | None = Query(None),
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[Mesa]:
    q = db.query(Mesa).order_by(Mesa.id)
    if status_filtro:
        try:
            q = q.filter(Mesa.status == MesaStatus(status_filtro))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Status inválido.") from exc
    if setor:
        q = q.filter(Mesa.setor == setor)
    return q.all()


@router.post("", response_model=MesaOut, status_code=status.HTTP_201_CREATED)
def criar_mesa(
    body: MesaCreate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = Mesa(
        nome=body.nome,
        qr_token=Mesa.novo_token(),
        status=MesaStatus.livre,
        capacidade=body.capacidade if body.capacidade is not None else 4,
        setor=body.setor,
    )
    db.add(mesa)
    db.commit()
    db.refresh(mesa)
    return mesa


@router.get("/por-token/{token}", response_model=MesaPublic)
def mesa_por_token(token: str, db: Session = Depends(get_db)) -> MesaPublic:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return MesaPublic(
        id=mesa.id,
        nome=mesa.nome,
        status=mesa.status.value if hasattr(mesa.status, "value") else str(mesa.status),
        capacidade=mesa.capacidade if mesa.capacidade is not None else 4,
        estabelecimento_nome=_nome_estabelecimento(db),
    )


@router.get("/{mesa_id}", response_model=MesaOut)
def obter_mesa(
    mesa_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return mesa


@router.patch("/{mesa_id}", response_model=MesaOut)
def atualizar_mesa(
    mesa_id: int,
    body: MesaUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    if body.nome is not None:
        mesa.nome = body.nome
    if body.status is not None:
        mesa.status = MesaStatus(body.status)
    if body.capacidade is not None:
        mesa.capacidade = body.capacidade
    if body.setor is not None:
        mesa.setor = body.setor
    db.commit()
    db.refresh(mesa)
    return mesa


@router.delete("/{mesa_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_mesa(
    mesa_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Response:
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    db.delete(mesa)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{mesa_id}/abrir", response_model=MesaOut)
def abrir_mesa(
    mesa_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    if mesa.status == MesaStatus.fechada:
        raise HTTPException(
            status_code=400,
            detail="Mesa fechada. Use reabrir antes de abrir.",
        )
    mesa.status = MesaStatus.ocupada
    db.commit()
    db.refresh(mesa)
    return mesa


@router.post("/{mesa_id}/liberar")
def liberar_mesa_por_id(
    mesa_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
):
    """Alias F1: libera por id (mesmo critério de /conta/.../liberar)."""
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
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
    }


@router.post("/{mesa_id}/reabrir", response_model=MesaOut)
def reabrir_mesa(
    mesa_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = db.get(Mesa, mesa_id)
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    if mesa.status != MesaStatus.fechada:
        raise HTTPException(status_code=400, detail="Somente mesas fechadas podem ser reabertas.")
    mesa.status = MesaStatus.livre
    db.commit()
    db.refresh(mesa)
    return mesa
