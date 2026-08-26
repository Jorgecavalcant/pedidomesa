import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("DEMO_TOKEN_SECRET", "test-secret")
os.environ.setdefault("DEMO_ESTABELECIMENTO_USER", "demo")
os.environ.setdefault("DEMO_ESTABELECIMENTO_PASS", "demo123")

from app.config import get_settings

get_settings.cache_clear()

import pytest
from fastapi.testclient import TestClient

from app.auth import issue_demo_token
from app.database import Base, engine, init_db
from app.main import app, seed_users


@pytest.fixture(autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    init_db()
    seed_users()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_header():
    return {"Authorization": f"Bearer {issue_demo_token()}"}
