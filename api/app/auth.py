from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import get_settings

security = HTTPBearer(auto_error=False)


def issue_demo_token() -> str:
    settings = get_settings()
    return f"demo-{settings.demo_token_secret}"


def require_estabelecimento(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    expected = issue_demo_token()
    if credentials is None or credentials.credentials != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sua sessão expirou. Faça login novamente.",
        )
    return credentials.credentials
