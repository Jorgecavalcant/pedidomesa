from fastapi import APIRouter, HTTPException, status

from app.auth import issue_demo_token
from app.config import get_settings
from app.schemas import DemoLogin, TokenOut

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/demo", response_model=TokenOut)
def login_demo(body: DemoLogin) -> TokenOut:
    settings = get_settings()
    if (
        body.usuario != settings.demo_estabelecimento_user
        or body.senha != settings.demo_estabelecimento_pass
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
        )
    return TokenOut(access_token=issue_demo_token())
