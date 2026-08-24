from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.auth import require_estabelecimento
from app.payments import get_provider, list_providers
from app.schemas import ChargeIn, ChargeOut

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.get("/providers")
def providers() -> dict[str, list[str]]:
    return {"providers": list_providers()}


@router.post("/charge", response_model=ChargeOut)
def charge(
    body: ChargeIn,
    _: str = Depends(require_estabelecimento),
) -> ChargeOut:
    try:
        provider = get_provider(body.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return provider.charge(body)
