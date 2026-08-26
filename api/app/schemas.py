from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    mesas_ids: list[int] | None = None


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
    capacidade: int = Field(default=4, ge=1, le=99)
    setor: str | None = Field(default=None, max_length=40)


class MesaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=80)
    status: Literal["livre", "ocupada", "fechada"] | None = None
    capacidade: int | None = Field(default=None, ge=1, le=99)
    setor: str | None = Field(default=None, max_length=40)


class MesaOut(BaseModel):
    id: int
    nome: str
    qr_token: str
    status: str
    capacidade: int = 4
    setor: str | None = None
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class MesaPublic(BaseModel):
    id: int
    nome: str
    status: str
    capacidade: int = 4
    estabelecimento_nome: str | None = None


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
    posicoes: list[int] | None = None
    cliente_sessao_id: int | None = None


class PedidoStatusUpdate(BaseModel):
    status: Literal["pendente", "preparando", "pronto", "entregue", "cancelado"]


class PedidoPosicoesUpdate(BaseModel):
    posicoes: list[int] = Field(default_factory=list)


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
    posicoes: list[int] | None = None
    quitado: bool = False
    fechamento_id: int | None = None
    cliente_sessao_id: int | None = None
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
    por_posicao: dict[str, int] = {}
    saldo_aberto_centavos: int = 0
    taxa_bps: int = 1000


class FecharContaIn(BaseModel):
    escopo: Literal["posicoes", "itens", "mesa"] = "mesa"
    posicoes: list[int] | None = None
    pedido_ids: list[int] | None = None
    aplicar_taxa: bool = True


class FecharContaOut(BaseModel):
    ok: bool = True
    fechamento_id: int
    escopo: str
    subtotal_centavos: int
    taxa_bps_aplicada: int
    taxa_centavos: int
    total_centavos: int
    mesa_saldo_aberto_centavos: int
    saldo_restante_centavos: int | None = None  # alias soft
    mesa_status: str
    status: str | None = None  # compat: espelha mesa_status
    mesa_id: int
    mesa_nome: str | None = None
    mensagem_conta: str | None = None


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
    taxa_servico_bps: int = 1000
    lgpd_texto_versao: str = "pm-qr-consent-v1"
    lgpd_texto: str = ""

    model_config = {"from_attributes": True}


class SettingsUpdate(BaseModel):
    nome_estabelecimento: str | None = Field(default=None, min_length=1, max_length=120)
    mensagem_conta: str | None = Field(default=None, max_length=280)
    taxa_servico_bps: int | None = Field(default=None, ge=0, le=10000)
    lgpd_texto_versao: str | None = Field(default=None, max_length=32)
    lgpd_texto: str | None = None


# ---------- Cliente / LGPD ----------
class ClienteSessaoIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    nome: str = Field(min_length=1, max_length=80)
    celular: str = Field(
        min_length=8,
        max_length=20,
        validation_alias=AliasChoices("celular", "celular_e164"),
    )
    consent_aceito: bool
    consent_texto_versao: str | None = Field(default=None, max_length=32)
    device_token: str = Field(min_length=8, max_length=200)
    posicoes: list[int] | None = None


class ClienteReentrarIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    celular: str = Field(
        min_length=8,
        max_length=20,
        validation_alias=AliasChoices("celular", "celular_e164"),
    )
    device_token: str = Field(min_length=8, max_length=200)
    mesa_token: str | None = None


class ClienteSessaoOut(BaseModel):
    id: int
    mesa_id: int
    nome: str
    celular_ult4: str
    consent_texto_versao: str
    posicoes: list[int] | None = None
    ativa: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- Users ----------
class UserCreate(BaseModel):
    usuario: str = Field(min_length=1, max_length=80)
    senha: str = Field(min_length=4, max_length=120)
    papel: Literal["dono", "garcom", "cozinha"]
    mesas_ids: list[int] | None = None
    ativo: bool = True


class UserUpdate(BaseModel):
    senha: str | None = Field(default=None, min_length=4, max_length=120)
    papel: Literal["dono", "garcom", "cozinha"] | None = None
    mesas_ids: list[int] | None = None
    ativo: bool | None = None


class UserOut(BaseModel):
    id: int
    usuario: str
    papel: str
    mesas_ids: list[int] | None = None
    ativo: bool

    model_config = {"from_attributes": True}


# ---------- Solicitações ----------
class SolicitacaoCreate(BaseModel):
    tipo: Literal["cancelar_pedido", "estorno", "editar_pedido"]
    pedido_id: int | None = None
    payload: dict | None = None


class SolicitacaoOut(BaseModel):
    id: int
    tipo: str
    pedido_id: int | None
    payload: dict | None
    status: str
    solicitante_id: int
    aprovador_id: int | None
    created_at: datetime | None = None
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}


# ---------- Transferências (F1.5 stub) ----------
class TransferenciaCreate(BaseModel):
    mesa_origem_id: int
    mesa_destino_id: int
    pedido_ids: list[int] = Field(min_length=1)
    posicoes_origem: list[int] | None = None
    posicoes_destino: list[int] | None = None
    solicitante_papel: Literal["cliente", "garcom"] = "garcom"


class TransferenciaOut(BaseModel):
    id: int
    mesa_origem_id: int
    mesa_destino_id: int
    pedido_ids: list[int]
    posicoes_origem: list[int] | None
    posicoes_destino: list[int] | None
    status: str
    solicitante_papel: str
    aprovador_id: int | None
    created_at: datetime | None = None
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}
