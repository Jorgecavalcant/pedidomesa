from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import auth, conta, cozinha, health, mesas, pedidos

settings = get_settings()

app = FastAPI(title="PedidoMesa API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(mesas.router)
app.include_router(pedidos.router)
app.include_router(cozinha.router)
app.include_router(conta.router)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
