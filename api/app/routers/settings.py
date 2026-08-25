from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import EstabelecimentoSettings
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


def _get_or_create(db: Session) -> EstabelecimentoSettings:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    if row:
        return row
    row = EstabelecimentoSettings(
        nome_estabelecimento="PedidoMesa",
        mensagem_conta="Obrigado — volte sempre",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> EstabelecimentoSettings:
    return _get_or_create(db)


@router.patch("", response_model=SettingsOut)
def patch_settings(
    body: SettingsUpdate,
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> EstabelecimentoSettings:
    row = _get_or_create(db)
    if body.nome_estabelecimento is not None:
        row.nome_estabelecimento = body.nome_estabelecimento
    if body.mensagem_conta is not None:
        row.mensagem_conta = body.mensagem_conta
    db.commit()
    db.refresh(row)
    return row
