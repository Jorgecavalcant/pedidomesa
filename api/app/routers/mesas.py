from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import Mesa, MesaStatus
from app.schemas import MesaCreate, MesaOut, MesaPublic, MesaUpdate

router = APIRouter(prefix="/api/v1/mesas", tags=["mesas"])


@router.get("", response_model=list[MesaOut])
def listar_mesas(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[Mesa]:
    return db.query(Mesa).order_by(Mesa.id).all()


@router.post("", response_model=MesaOut, status_code=status.HTTP_201_CREATED)
def criar_mesa(
    body: MesaCreate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> Mesa:
    mesa = Mesa(nome=body.nome, qr_token=Mesa.novo_token(), status=MesaStatus.livre)
    db.add(mesa)
    db.commit()
    db.refresh(mesa)
    return mesa


@router.get("/por-token/{token}", response_model=MesaPublic)
def mesa_por_token(token: str, db: Session = Depends(get_db)) -> Mesa:
    mesa = db.query(Mesa).filter(Mesa.qr_token == token).first()
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa não encontrada.")
    return mesa


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
