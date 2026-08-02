from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@gpfx-postgres:5432/gpfx"
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    INTERNAL_API_KEY: str = "dev-internal-key"
    OPENAI_API_KEY: str = ""
    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "saas"
    MINIO_USE_SSL: bool = True
    REDIS_URL: str = "redis://redis:6379/0"
    N8N_WEBHOOK_URL: str = ""
    MTCONNECT_API_KEY: str = ""
    BROKER_CREDENTIALS_KEY: str = ""
    CORS_ORIGINS: str = (
        "http://localhost:5173,http://localhost:3000,http://localhost:8080,"
        "https://fx.testedev.online,https://www.fx.testedev.online"
    )
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_PER_HOUR: int = 1000

    class Config:
        env_file = ".env"
        extra = "ignore"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def validate_database_url(cls, v: str | None) -> str:
        if not v or not str(v).strip():
            return "postgresql://postgres:postgres@gpfx-postgres:5432/gpfx"
        return str(v).strip()

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def validate_redis_url(cls, v: str | None) -> str:
        if not v or not str(v).strip():
            return "redis://redis:6379/0"
        return str(v).strip()

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
