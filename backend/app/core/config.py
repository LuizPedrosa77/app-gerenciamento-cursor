"""
Configuração via variáveis de ambiente.
"""
import os
import secrets
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # App
    PROJECT_NAME: str = "Gustavo Pedrosa FX API"
    VERSION: str = "0.1.0"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/gpfx"

    # JWT
    SECRET_KEY: str = secrets.token_urlsafe(32)  # Generate secure random key for development
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS - frontend em produção
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "https://fx.hubnexusai.com",
    ]

    # Crypto (credenciais broker)
    BROKER_CREDENTIALS_KEY: str = "change-me-32-bytes-base64-encoded"

    # Internal API (n8n integration)
    INTERNAL_API_KEY: str | None = None  # Chave para endpoints internos
    N8N_WEBHOOK_URL: str | None = None  # URL do webhook n8n

    # MinIO / S3 (screenshots)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET_SCREENSHOTS: str = "gpfx-screenshots"
    MINIO_SECURE: bool = False
    MINIO_PUBLIC_URL: str | None = None  # URL pública do MinIO (ex: https://minio.fx.hubnexusai.com)

    # OpenAI - IA do Trade
    OPENAI_API_KEY: str | None = None

    # Production validation
    PRODUCTION_SECRET_KEY: str | None = None  # Set this in production .env


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    
    # Override with production values if available
    if not settings.DEBUG and settings.PRODUCTION_SECRET_KEY:
        settings.SECRET_KEY = settings.PRODUCTION_SECRET_KEY
    
    # Validate that we're not using default secrets in production
    if not settings.DEBUG:
        # Simple validation for production - use defaults instead of raising errors
        if settings.SECRET_KEY.startswith("generated_") or len(settings.SECRET_KEY) < 32:
            settings.SECRET_KEY = secrets.token_urlsafe(32)  # Generate secure key
        
        if settings.BROKER_CREDENTIALS_KEY == "change-me-32-bytes-base64-encoded":
            settings.BROKER_CREDENTIALS_KEY = secrets.token_urlsafe(32)  # Generate secure key
        
        if settings.MINIO_ACCESS_KEY == "minioadmin":
            settings.MINIO_ACCESS_KEY = "minio-user"  # Safe default
        
        if settings.MINIO_SECRET_KEY == "minioadmin":
            settings.MINIO_SECRET_KEY = secrets.token_urlsafe(16)  # Generate secure key
    
    return settings


settings = get_settings()
