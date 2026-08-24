from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+pysqlite:///./pedidomesa.db"
    cors_origins: str = "http://localhost:3000"
    demo_estabelecimento_user: str = "demo"
    demo_estabelecimento_pass: str = "demo123"
    demo_token_secret: str = "dev-secret-change-me"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
