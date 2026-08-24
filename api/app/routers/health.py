from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_root() -> dict[str, str]:
    return {"status": "ok", "service": "pedidomesa"}


@router.get("/api/v1/health")
def health_api() -> dict[str, str]:
    return {"status": "ok", "service": "pedidomesa-api"}
