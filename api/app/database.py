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


def _dialect_name() -> str:
    return engine.dialect.name


def _json_type() -> str:
    return "JSONB" if _dialect_name() == "postgresql" else "JSON"


def _bool_default(val: bool) -> str:
    if _dialect_name() == "postgresql":
        return "TRUE" if val else "FALSE"
    return "1" if val else "0"


def _add_column_if_missing(table: str, column: str, ddl_type: str) -> None:
    """DDL incremental — create_all não altera tabelas existentes."""
    insp = inspect(engine)
    if table not in set(insp.get_table_names()):
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if column in cols:
        return
    try:
        with engine.begin() as conn:
            if _dialect_name() == "postgresql":
                conn.execute(
                    text(
                        f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl_type}"
                    )
                )
            else:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
        print(f"[migrate] + {table}.{column}")
    except Exception as exc:  # noqa: BLE001 — não derrubar startup
        print(f"[migrate] FAIL {table}.{column}: {exc}")


def _backfill_nulls() -> None:
    stmts = [
        "UPDATE mesas SET capacidade = 4 WHERE capacidade IS NULL",
        "UPDATE pedidos SET quitado = false WHERE quitado IS NULL",
        "UPDATE estabelecimento_settings SET taxa_servico_bps = 1000 WHERE taxa_servico_bps IS NULL",
        "UPDATE estabelecimento_settings SET lgpd_texto_versao = 'pm-qr-consent-v1' WHERE lgpd_texto_versao IS NULL",
        "UPDATE estabelecimento_settings SET lgpd_texto = '' WHERE lgpd_texto IS NULL",
        "UPDATE users SET ativo = true WHERE ativo IS NULL",
    ]
    with engine.begin() as conn:
        for sql in stmts:
            try:
                conn.execute(text(sql))
            except Exception as exc:  # noqa: BLE001
                print(f"[migrate] backfill skip: {exc}")


def migrate_schema() -> None:
    """Garante colunas F1 em bancos já existentes (VPS Postgres)."""
    json_t = _json_type()
    _add_column_if_missing("mesas", "capacidade", "INTEGER DEFAULT 4")
    _add_column_if_missing("mesas", "setor", "VARCHAR(40)")
    _add_column_if_missing("pedidos", "posicoes", json_t)
    _add_column_if_missing(
        "pedidos", "quitado", f"BOOLEAN DEFAULT {_bool_default(False)}"
    )
    _add_column_if_missing("pedidos", "fechamento_id", "INTEGER")
    _add_column_if_missing("pedidos", "cliente_sessao_id", "INTEGER")
    _add_column_if_missing(
        "estabelecimento_settings",
        "taxa_servico_bps",
        "INTEGER DEFAULT 1000",
    )
    _add_column_if_missing(
        "estabelecimento_settings",
        "lgpd_texto_versao",
        "VARCHAR(32) DEFAULT 'pm-qr-consent-v1'",
    )
    _add_column_if_missing("estabelecimento_settings", "lgpd_texto", "TEXT")
    _add_column_if_missing("users", "mesas_ids", json_t)
    _add_column_if_missing(
        "users", "ativo", f"BOOLEAN DEFAULT {_bool_default(True)}"
    )
    _backfill_nulls()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_schema()
