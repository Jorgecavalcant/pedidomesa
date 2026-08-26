from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import CurrentUser, get_current_user, require_dono, require_estabelecimento
from app.database import get_db
from app.models import Pedido, PedidoStatus, SolicitacaoAcao, SolicitacaoStatus, SolicitacaoTipo
from app.schemas import SolicitacaoCreate, SolicitacaoOut

router = APIRouter(prefix="/api/v1/solicitacoes", tags=["solicitacoes"])


@router.get("", response_model=list[SolicitacaoOut])
def listar(
    status_filtro: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> list[SolicitacaoAcao]:
    q = db.query(SolicitacaoAcao).order_by(SolicitacaoAcao.id.desc())
    if status_filtro:
        try:
            q = q.filter(SolicitacaoAcao.status == SolicitacaoStatus(status_filtro))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Status inválido.") from exc
    return q.limit(100).all()


@router.post("", response_model=SolicitacaoOut, status_code=status.HTTP_201_CREATED)
def criar(
    body: SolicitacaoCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SolicitacaoAcao:
    if body.pedido_id is not None:
        pedido = db.get(Pedido, body.pedido_id)
        if not pedido:
            raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    solicitante_id = user.user_id
    if solicitante_id is None:
        # seed implícito: cria/usa user demo conforme papel do token
        from app.config import get_settings
        from app.models import User, UserPapel

        settings = get_settings()
        usuario = (
            settings.demo_estabelecimento_user
            if user.papel == "dono"
            else f"demo_{user.papel}"
        )
        row = db.query(User).filter(User.usuario == usuario).first()
        if row is None:
            row = User(
                usuario=usuario,
                senha=settings.demo_estabelecimento_pass,
                papel=UserPapel(user.papel),
                ativo=True,
            )
            db.add(row)
            db.flush()
        solicitante_id = row.id

    sol = SolicitacaoAcao(
        tipo=SolicitacaoTipo(body.tipo),
        pedido_id=body.pedido_id,
        payload=body.payload,
        status=SolicitacaoStatus.pending,
        solicitante_id=solicitante_id,
    )
    db.add(sol)
    db.commit()
    db.refresh(sol)
    return sol


def _resolver(
    solicitacao_id: int,
    novo_status: SolicitacaoStatus,
    db: Session,
    aprovador: CurrentUser,
) -> SolicitacaoAcao:
    sol = db.get(SolicitacaoAcao, solicitacao_id)
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada.")
    if sol.status != SolicitacaoStatus.pending:
        raise HTTPException(status_code=400, detail="Solicitação já foi resolvida.")

    aprovador_id = aprovador.user_id
    if aprovador_id is None:
        from app.config import get_settings
        from app.models import User, UserPapel

        settings = get_settings()
        row = (
            db.query(User)
            .filter(User.usuario == settings.demo_estabelecimento_user)
            .first()
        )
        if row is None:
            row = User(
                usuario=settings.demo_estabelecimento_user,
                senha=settings.demo_estabelecimento_pass,
                papel=UserPapel.dono,
                ativo=True,
            )
            db.add(row)
            db.flush()
        aprovador_id = row.id

    sol.status = novo_status
    sol.aprovador_id = aprovador_id
    sol.resolved_at = datetime.now(timezone.utc)

    if novo_status == SolicitacaoStatus.approved and sol.pedido_id:
        pedido = db.get(Pedido, sol.pedido_id)
        if pedido and sol.tipo == SolicitacaoTipo.cancelar_pedido:
            pedido.status = PedidoStatus.cancelado

    db.commit()
    db.refresh(sol)
    return sol


@router.post("/{solicitacao_id}/aprovar", response_model=SolicitacaoOut)
def aprovar(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_dono),
) -> SolicitacaoAcao:
    return _resolver(solicitacao_id, SolicitacaoStatus.approved, db, user)


@router.post("/{solicitacao_id}/rejeitar", response_model=SolicitacaoOut)
def rejeitar(
    solicitacao_id: int,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_dono),
) -> SolicitacaoAcao:
    return _resolver(solicitacao_id, SolicitacaoStatus.rejected, db, user)
