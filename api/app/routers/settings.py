from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_estabelecimento
from app.database import get_db
from app.models import EstabelecimentoSettings
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


_LGPD_DEFAULT = (
    "Ao continuar, você autoriza o estabelecimento a tratar seu nome e celular "
    "para identificar você nesta mesa, reunir seu pedido e permitir que você "
    "volte à mesa aberta pelo celular, até o fechamento. Tratamento pela "
    "plataforma PedidoMesa (Tech42). Não usamos seus dados para marketing."
)


def _normalize_settings_row(row: EstabelecimentoSettings) -> EstabelecimentoSettings:
    dirty = False
    if row.taxa_servico_bps is None:
        row.taxa_servico_bps = 1000
        dirty = True
    if not row.lgpd_texto_versao:
        row.lgpd_texto_versao = "pm-qr-consent-v1"
        dirty = True
    if not row.lgpd_texto:
        row.lgpd_texto = _LGPD_DEFAULT
        dirty = True
    if dirty:
        return row
    return row


def _get_or_create(db: Session) -> EstabelecimentoSettings:
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    if row:
        before = (
            row.taxa_servico_bps,
            row.lgpd_texto_versao,
            (row.lgpd_texto or "")[:40],
        )
        row = _normalize_settings_row(row)
        after = (
            row.taxa_servico_bps,
            row.lgpd_texto_versao,
            (row.lgpd_texto or "")[:40],
        )
        if before != after:
            db.commit()
            db.refresh(row)
        return row
    row = EstabelecimentoSettings(
        nome_estabelecimento="PedidoMesa",
        mensagem_conta="Obrigado — volte sempre",
        taxa_servico_bps=1000,
        lgpd_texto_versao="pm-qr-consent-v1",
        lgpd_texto=_LGPD_DEFAULT,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("", response_model=SettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> SettingsOut:
    try:
        row = _get_or_create(db)
        return SettingsOut.model_validate(row)
    except Exception:
        # Fallback seguro — não derruba a home/settings em prod
        return SettingsOut(
            nome_estabelecimento="PedidoMesa",
            mensagem_conta="Obrigado — volte sempre",
            taxa_servico_bps=1000,
            lgpd_texto_versao="pm-qr-consent-v1",
            lgpd_texto=_LGPD_DEFAULT,
        )


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
    if body.taxa_servico_bps is not None:
        row.taxa_servico_bps = body.taxa_servico_bps
    if body.lgpd_texto_versao is not None:
        row.lgpd_texto_versao = body.lgpd_texto_versao
    if body.lgpd_texto is not None:
        row.lgpd_texto = body.lgpd_texto
    db.commit()
    db.refresh(row)
    return row
