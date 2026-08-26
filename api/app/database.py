from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings

settings = get_settings()

engine_kwargs: dict = {}
if settings.database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in settings.database_url:
        engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _add_column_if_missing(table: str, column: str, ddl_type: str) -> None:
    """DDL incremental — create_all não altera tabelas existentes."""
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if column in cols:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))


def migrate_schema() -> None:
    """Garante colunas F1 em bancos já existentes (VPS)."""
    _add_column_if_missing("mesas", "capacidade", "INTEGER DEFAULT 4 NOT NULL")
    _add_column_if_missing("mesas", "setor", "VARCHAR(40)")
    _add_column_if_missing("pedidos", "posicoes", "JSON")
    _add_column_if_missing("pedidos", "quitado", "BOOLEAN DEFAULT FALSE NOT NULL")
    _add_column_if_missing("pedidos", "fechamento_id", "INTEGER")
    _add_column_if_missing("pedidos", "cliente_sessao_id", "INTEGER")
    _add_column_if_missing(
        "estabelecimento_settings",
        "taxa_servico_bps",
        "INTEGER DEFAULT 1000 NOT NULL",
    )
    _add_column_if_missing(
        "estabelecimento_settings",
        "lgpd_texto_versao",
        "VARCHAR(32) DEFAULT 'pm-qr-consent-v1'",
    )
    _add_column_if_missing("estabelecimento_settings", "lgpd_texto", "TEXT")
    _add_column_if_missing("users", "mesas_ids", "JSON")
    _add_column_if_missing("users", "ativo", "BOOLEAN DEFAULT TRUE NOT NULL")


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_schema()
