from __future__ import annotations

from typing import List, Optional

import enum
import secrets
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MesaStatus(str, enum.Enum):
    livre = "livre"
    ocupada = "ocupada"
    fechada = "fechada"


class PedidoModo(str, enum.Enum):
    individual = "individual"
    coletivo = "coletivo"


class PedidoStatus(str, enum.Enum):
    pendente = "pendente"
    preparando = "preparando"
    pronto = "pronto"
    entregue = "entregue"
    cancelado = "cancelado"


class UserPapel(str, enum.Enum):
    dono = "dono"
    garcom = "garcom"
    cozinha = "cozinha"


class FechamentoEscopo(str, enum.Enum):
    posicoes = "posicoes"
    itens = "itens"
    mesa = "mesa"


class SolicitacaoTipo(str, enum.Enum):
    cancelar_pedido = "cancelar_pedido"
    estorno = "estorno"
    editar_pedido = "editar_pedido"


class SolicitacaoStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TransferenciaStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Mesa(Base):
    __tablename__ = "mesas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    status: Mapped[MesaStatus] = mapped_column(
        Enum(MesaStatus), default=MesaStatus.livre, nullable=False
    )
    capacidade: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    setor: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pedidos: Mapped[List["Pedido"]] = relationship(back_populates="mesa")

    @staticmethod
    def novo_token() -> str:
        return secrets.token_urlsafe(16)


class CardapioItem(Base):
    __tablename__ = "cardapio_itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    descricao: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    preco_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mesa_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False, index=True)
    cardapio_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("cardapio_itens.id"), nullable=True
    )
    nome_item: Mapped[str] = mapped_column(String(120), nullable=False)
    quantidade: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    preco_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    modo: Mapped[PedidoModo] = mapped_column(Enum(PedidoModo), nullable=False)
    cliente_nome: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    status: Mapped[PedidoStatus] = mapped_column(
        Enum(PedidoStatus), default=PedidoStatus.pendente, nullable=False
    )
    # vazio/null = coletivo da mesa; ≥1 = posições cobradas
    posicoes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)
    quitado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fechamento_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("fechamentos.id"), nullable=True, index=True
    )
    cliente_sessao_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("cliente_mesa_sessoes.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    mesa: Mapped["Mesa"] = relationship(back_populates="pedidos")
    fechamento: Mapped[Optional["Fechamento"]] = relationship(
        back_populates="pedidos", foreign_keys=[fechamento_id]
    )
    cliente_sessao: Mapped[Optional["ClienteMesaSessao"]] = relationship(
        back_populates="pedidos", foreign_keys=[cliente_sessao_id]
    )


class EstabelecimentoSettings(Base):
    __tablename__ = "estabelecimento_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_estabelecimento: Mapped[str] = mapped_column(String(120), default="PedidoMesa")
    mensagem_conta: Mapped[str] = mapped_column(
        String(280), default="Obrigado — volte sempre"
    )
    taxa_servico_bps: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    lgpd_texto_versao: Mapped[str] = mapped_column(String(32), default="pm-qr-consent-v1")
    lgpd_texto: Mapped[str] = mapped_column(
        Text,
        default=(
            "Ao continuar, você autoriza o estabelecimento a tratar seu nome e celular "
            "para identificar você nesta mesa, reunir seu pedido e permitir que você "
            "volte à mesa aberta pelo celular, até o fechamento. Tratamento pela "
            "plataforma PedidoMesa (Tech42). Não usamos seus dados para marketing."
        ),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    senha: Mapped[str] = mapped_column(String(120), nullable=False)
    papel: Mapped[UserPapel] = mapped_column(Enum(UserPapel), nullable=False)
    mesas_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClienteMesaSessao(Base):
    __tablename__ = "cliente_mesa_sessoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mesa_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    celular_e164: Mapped[str] = mapped_column(String(20), nullable=False)
    celular_ult4: Mapped[str] = mapped_column(String(4), nullable=False)
    consent_aceito: Mapped[bool] = mapped_column(Boolean, nullable=False)
    consent_texto_versao: Mapped[str] = mapped_column(String(32), nullable=False)
    consent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device_token_hash: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    posicoes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    ativa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pedidos: Mapped[List["Pedido"]] = relationship(
        back_populates="cliente_sessao", foreign_keys="Pedido.cliente_sessao_id"
    )


class Fechamento(Base):
    __tablename__ = "fechamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mesa_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False, index=True)
    escopo: Mapped[FechamentoEscopo] = mapped_column(Enum(FechamentoEscopo), nullable=False)
    posicoes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    pedido_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    subtotal_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    taxa_bps_aplicada: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    taxa_centavos: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_centavos: Mapped[int] = mapped_column(Integer, nullable=False)
    pagamento_modo: Mapped[str] = mapped_column(String(40), default="manual", nullable=False)
    criado_por_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    pedidos: Mapped[List["Pedido"]] = relationship(
        back_populates="fechamento", foreign_keys="Pedido.fechamento_id"
    )


class SolicitacaoAcao(Base):
    __tablename__ = "solicitacoes_acao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[SolicitacaoTipo] = mapped_column(Enum(SolicitacaoTipo), nullable=False)
    pedido_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pedidos.id"), nullable=True)
    payload: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[SolicitacaoStatus] = mapped_column(
        Enum(SolicitacaoStatus), default=SolicitacaoStatus.pending, nullable=False
    )
    solicitante_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class TransferenciaSolicitacao(Base):
    __tablename__ = "transferencias_solicitacao"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mesa_origem_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False)
    mesa_destino_id: Mapped[int] = mapped_column(ForeignKey("mesas.id"), nullable=False)
    pedido_ids: Mapped[list] = mapped_column(JSON, nullable=False)
    posicoes_origem: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    posicoes_destino: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    status: Mapped[TransferenciaStatus] = mapped_column(
        Enum(TransferenciaStatus), default=TransferenciaStatus.pending, nullable=False
    )
    solicitante_papel: Mapped[str] = mapped_column(String(20), nullable=False)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
