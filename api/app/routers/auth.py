from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user, issue_demo_token, require_estabelecimento
from app.config import get_settings
from app.database import get_db
from app.models import EstabelecimentoSettings, User, UserPapel
from app.schemas import DemoLogin, LoginIn, MeOut, OkOut, TokenOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _find_user(db: Session, usuario: str, senha: str) -> User | None:
    row = db.query(User).filter(User.usuario == usuario, User.ativo.is_(True)).first()
    if row and row.senha == senha:
        return row
    return None


def _login_resolve(db: Session, usuario: str, senha: str) -> tuple[str, str]:
    """Retorna (access_token, papel)."""
    settings = get_settings()
    row = _find_user(db, usuario, senha)
    if row:
        papel = row.papel.value if hasattr(row.papel, "value") else str(row.papel)
        return issue_demo_token(papel), papel  # type: ignore[arg-type]

    # Compat env demo = dono
    if (
        usuario == settings.demo_estabelecimento_user
        and senha == settings.demo_estabelecimento_pass
    ):
        return issue_demo_token("dono"), "dono"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Usuário ou senha incorretos.",
    )


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    token, papel = _login_resolve(db, body.usuario, body.senha)
    return TokenOut(access_token=token, papel=papel)  # type: ignore[arg-type]


@router.post("/demo", response_model=TokenOut)
def login_demo(body: DemoLogin, db: Session = Depends(get_db)) -> TokenOut:
    """Compat CI / testes — UI deve usar POST /login."""
    token, papel = _login_resolve(db, body.usuario, body.senha)
    return TokenOut(access_token=token, papel=papel)  # type: ignore[arg-type]


@router.get("/me", response_model=MeOut)
def me(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> MeOut:
    settings = get_settings()
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    nome = row.nome_estabelecimento if row else settings.estabelecimento_nome
    mesas_ids = None
    if user.user_id:
        urow = db.get(User, user.user_id)
        if urow is not None:
            mesas_ids = urow.mesas_ids
    return MeOut(
        usuario=user.usuario,
        papel=user.papel,
        estabelecimento_nome=nome,
        mesas_ids=mesas_ids,
    )


@router.post("/logout", response_model=OkOut)
def logout(_: str = Depends(require_estabelecimento)) -> OkOut:
    return OkOut(ok=True)
