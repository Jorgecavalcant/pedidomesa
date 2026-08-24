from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DemoLogin(BaseModel):
    usuario: str
    senha: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


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


class PedidoCreate(BaseModel):
    mesa_token: str
    nome_item: str = Field(min_length=1, max_length=120)
    quantidade: int = Field(default=1, ge=1, le=99)
    preco_centavos: int = Field(ge=0)
    modo: Literal["individual", "coletivo"]
    cliente_nome: str | None = Field(default=None, max_length=80)


class PedidoStatusUpdate(BaseModel):
    status: Literal["pendente", "preparando", "pronto", "entregue", "cancelado"]


class PedidoOut(BaseModel):
    id: int
    mesa_id: int
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
