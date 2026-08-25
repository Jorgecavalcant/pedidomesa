from __future__ import annotations

from typing import List, Optional

import enum
import secrets
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
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


class Mesa(Base):
    __tablename__ = "mesas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), nullable=False)
    qr_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    status: Mapped[MesaStatus] = mapped_column(
        Enum(MesaStatus), default=MesaStatus.livre, nullable=False
    )
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    mesa: Mapped["Mesa"] = relationship(back_populates="pedidos")


class EstabelecimentoSettings(Base):
    __tablename__ = "estabelecimento_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome_estabelecimento: Mapped[str] = mapped_column(String(120), default="PedidoMesa")
    mensagem_conta: Mapped[str] = mapped_column(
        String(280), default="Obrigado — volte sempre"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
