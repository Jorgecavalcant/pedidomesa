from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class DemoLogin(BaseModel):
    usuario: str
    senha: str


class LoginIn(BaseModel):
    usuario: str
    senha: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    papel: Literal["dono", "garcom", "cozinha"] = "dono"


class MeOut(BaseModel):
    usuario: str
    papel: Literal["dono", "garcom", "cozinha"]
    estabelecimento_nome: str


class OkOut(BaseModel):
    ok: bool = True


class MetricasOut(BaseModel):
    data_ref: str
    mesas_abertas: int
    pedidos_pendentes: int
    ticket_medio_centavos: int
    faturamento_hoje_centavos: int
    tempo_medio_preparo_segundos: int | None = None


class MesaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=80)


class MesaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    status: Literal["livre", "ocupada", "fechada"] | None = None


class MesaOut(BaseModel):
    id: int
    nome: str
    qr_token: str
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class MesaPublic(BaseModel):
    id: int
    nome: str
    status: str


# ---------- Cardápio ----------
class CardapioItemCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    descricao: str | None = Field(default=None, max_length=500)
    preco_centavos: int = Field(gt=0)


class CardapioItemUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    descricao: str | None = Field(default=None, max_length=500)
    preco_centavos: int | None = Field(default=None, gt=0)
    ativo: bool | None = None


class CardapioItemOut(BaseModel):
    id: int
    nome: str
    descricao: str | None
    preco_centavos: int
    ativo: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- Pedidos ----------
class PedidoCreate(BaseModel):
    mesa_token: str
    cardapio_item_id: int | None = None
    nome_item: str | None = Field(default=None, min_length=1, max_length=120)
    quantidade: int = Field(default=1, ge=1, le=99)
    preco_centavos: int | None = Field(default=None, ge=0)
    modo: Literal["individual", "coletivo"]
    cliente_nome: str | None = Field(default=None, max_length=80)


class PedidoStatusUpdate(BaseModel):
    status: Literal["pendente", "preparando", "pronto", "entregue", "cancelado"]


class PedidoOut(BaseModel):
    id: int
    mesa_id: int
    cardapio_item_id: int | None = None
    nome_item: str
    quantidade: int
    preco_centavos: int
    modo: str
    cliente_nome: str | None
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ContaOut(BaseModel):
    mesa_id: int
    mesa_nome: str
    status: str
    total_centavos: int
    itens: list[PedidoOut]
    por_modo: dict[str, int] = {}
    por_cliente: dict[str, int] = {}


# ---------- Pagamentos ----------
class ChargeIn(BaseModel):
    provider: str = "manual"
    valor_centavos: int = Field(gt=0)
    referencia: str | None = Field(default=None, max_length=200)


class ChargeOut(BaseModel):
    id: str
    provider: str
    status: str
    valor_centavos: int
    referencia: str | None = None


class SettingsOut(BaseModel):
    nome_estabelecimento: str
    mensagem_conta: str

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    nome_estabelecimento: str | None = Field(default=None, min_length=1, max_length=120)
    mensagem_conta: str | None = Field(default=None, max_length=280)
