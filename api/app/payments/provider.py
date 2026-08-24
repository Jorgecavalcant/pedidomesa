"""Camada plugável de pagamentos (padrão LavaSeguro).

MVP registra apenas `manual`. Nenhum gateway externo é dependência do core.
Novos providers implementam `PaymentProvider` e chamam `register_provider`.
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod

from app.schemas import ChargeIn, ChargeOut


class PaymentProvider(ABC):
    name: str = "base"

    @abstractmethod
    def charge(self, data: ChargeIn) -> ChargeOut: ...


class ManualProvider(PaymentProvider):
    """Registro manual (dinheiro, maquininha, pix avulso). Sem chamadas externas."""

    name = "manual"

    def charge(self, data: ChargeIn) -> ChargeOut:
        return ChargeOut(
            id=f"man_{uuid.uuid4().hex[:12]}",
            provider=self.name,
            status="pending_confirmation",
            valor_centavos=data.valor_centavos,
            referencia=data.referencia,
        )


_REGISTRY: dict[str, type[PaymentProvider]] = {}


def register_provider(cls: type[PaymentProvider]) -> type[PaymentProvider]:
    _REGISTRY[cls.name] = cls
    return cls


def get_provider(name: str) -> PaymentProvider:
    try:
        return _REGISTRY[name]()
    except KeyError:
        raise ValueError(f"Payment provider desconhecido: {name}") from None


def list_providers() -> list[str]:
    return sorted(_REGISTRY.keys())


register_provider(ManualProvider)
