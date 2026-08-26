from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db

security = HTTPBearer(auto_error=False)

Papel = Literal["dono", "garcom", "cozinha"]


@dataclass
class CurrentUser:
    usuario: str
    papel: Papel
    user_id: int | None = None
    token: str = ""


def issue_demo_token(papel: Papel = "dono") -> str:
    """Token demo. Compat: dono = demo-{secret}; outros = demo-{papel}-{secret}."""
    settings = get_settings()
    if papel == "dono":
        return f"demo-{settings.demo_token_secret}"
    return f"demo-{papel}-{settings.demo_token_secret}"


def parse_token_papel(token: str) -> Papel:
    settings = get_settings()
    secret = settings.demo_token_secret
    if token == f"demo-{secret}":
        return "dono"
    if token == f"demo-garcom-{secret}":
        return "garcom"
    if token == f"demo-cozinha-{secret}":
        return "cozinha"
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sua sessão expirou. Faça login novamente.",
    )


def require_estabelecimento(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    """Compat: valida token staff e devolve a string do token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua sessão expirou. Faça login novamente.",
        )
    parse_token_papel(credentials.credentials)
    return credentials.credentials


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua sessão expirou. Faça login novamente.",
        )
    token = credentials.credentials
    papel = parse_token_papel(token)

    from app.models import User, UserPapel

    # Resolve user_id pelo papel do token + usuário seed correspondente
    settings = get_settings()
    usuario_map = {
        "dono": settings.demo_estabelecimento_user,
        "garcom": "demo_garcom",
        "cozinha": "demo_cozinha",
    }
    usuario = usuario_map.get(papel, settings.demo_estabelecimento_user)
    row = (
        db.query(User)
        .filter(User.usuario == usuario, User.ativo.is_(True))
        .first()
    )
    if row is None:
        # fallback: qualquer user ativo com o papel
        row = (
            db.query(User)
            .filter(User.papel == UserPapel(papel), User.ativo.is_(True))
            .first()
        )
    return CurrentUser(
        usuario=row.usuario if row else usuario,
        papel=papel,
        user_id=row.id if row else None,
        token=token,
    )


def require_dono(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if user.papel != "dono":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para esta ação.",
        )
    return user
