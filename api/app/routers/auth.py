from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import issue_demo_token, require_estabelecimento
from app.config import get_settings
from app.database import get_db
from app.models import EstabelecimentoSettings
from app.schemas import DemoLogin, LoginIn, MeOut, OkOut, TokenOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _validate_credentials(usuario: str, senha: str) -> None:
    settings = get_settings()
    if (
        usuario != settings.demo_estabelecimento_user
        or senha != settings.demo_estabelecimento_pass
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
        )


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn) -> TokenOut:
    _validate_credentials(body.usuario, body.senha)
    return TokenOut(access_token=issue_demo_token(), papel="dono")


@router.post("/demo", response_model=TokenOut)
def login_demo(body: DemoLogin) -> TokenOut:
    """Compat CI / testes — UI deve usar POST /login."""
    _validate_credentials(body.usuario, body.senha)
    return TokenOut(access_token=issue_demo_token(), papel="dono")


@router.get("/me", response_model=MeOut)
def me(
    db: Session = Depends(get_db),
    _: str = Depends(require_estabelecimento),
) -> MeOut:
    settings = get_settings()
    row = db.query(EstabelecimentoSettings).order_by(EstabelecimentoSettings.id).first()
    nome = row.nome_estabelecimento if row else settings.estabelecimento_nome
    return MeOut(
        usuario=settings.demo_estabelecimento_user,
        papel="dono",
        estabelecimento_nome=nome,
    )


@router.post("/logout", response_model=OkOut)
def logout(_: str = Depends(require_estabelecimento)) -> OkOut:
    return OkOut(ok=True)
