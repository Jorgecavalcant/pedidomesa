from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal, init_db
from app.models import CardapioItem, User, UserPapel
from app.routers import (
    auth,
    cardapio,
    cliente,
    conta,
    cozinha,
    health,
    mesas,
    metricas,
    payments,
    pedidos,
    solicitacoes,
    transferencias,
    users,
)
from app.routers import settings as settings_router

settings = get_settings()

app = FastAPI(title="PedidoMesa API", version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(metricas.router)
app.include_router(mesas.router)
app.include_router(cardapio.router)
app.include_router(pedidos.router)
app.include_router(cozinha.router)
app.include_router(conta.router)
app.include_router(payments.router)
app.include_router(settings_router.router)
app.include_router(cliente.router)
app.include_router(solicitacoes.router)
app.include_router(users.router)
app.include_router(transferencias.router)

SEED_ITENS = [
    ("Porção Batata Frita", "Batata frita crocante com cheddar e bacon", 3500),
    ("Isca de Frango", "Porção de isca de frango com molho barbecue", 3200),
    ("X-Burguer Artesanal", "Pão brioche, burger 160g, queijo e molho da casa", 2800),
    ("Cerveja Long Neck", "Cerveja pilsner gelada 330ml", 1200),
    ("Caipirinha", "Limão, cachaça, açúcar e gelo", 1800),
    ("Refrigerante Lata", "Coca-Cola / Guaraná 350ml", 800),
]


def seed_cardapio() -> None:
    with SessionLocal() as db:
        existe = db.scalar(select(CardapioItem).limit(1))
        if existe:
            return
        for nome, descricao, preco in SEED_ITENS:
            db.add(
                CardapioItem(
                    nome=nome,
                    descricao=descricao,
                    preco_centavos=preco,
                    ativo=True,
                )
            )
        db.commit()


def seed_users() -> None:
    with SessionLocal() as db:
        demo_user = settings.demo_estabelecimento_user
        demo_pass = settings.demo_estabelecimento_pass
        seeds = [
            (demo_user, demo_pass, UserPapel.dono),
            ("demo_garcom", demo_pass, UserPapel.garcom),
        ]
        for usuario, senha, papel in seeds:
            row = db.query(User).filter(User.usuario == usuario).first()
            if row:
                continue
            db.add(
                User(
                    usuario=usuario,
                    senha=senha,
                    papel=papel,
                    mesas_ids=None,
                    ativo=True,
                )
            )
        db.commit()


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    seed_cardapio()
    seed_users()
