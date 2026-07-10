"""Encrypt/decrypt broker credentials at rest."""
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

ENC_PREFIX = "enc:"


def _fernet() -> Fernet | None:
    key = settings.BROKER_CREDENTIALS_KEY.strip()
    if not key:
        return None
    derived = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    return Fernet(derived)


def encrypt_credential(plain: str) -> str:
    if not plain:
        return plain
    f = _fernet()
    if not f:
        return plain
    token = f.encrypt(plain.encode("utf-8")).decode("utf-8")
    return f"{ENC_PREFIX}{token}"


def decrypt_credential(stored: str | None) -> str | None:
    if not stored:
        return stored
    if not stored.startswith(ENC_PREFIX):
        return stored
    f = _fernet()
    if not f:
        raise ValueError("BROKER_CREDENTIALS_KEY required to decrypt stored credentials")
    try:
        return f.decrypt(stored[len(ENC_PREFIX):].encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt broker credential") from exc


def is_encrypted(stored: str | None) -> bool:
    return bool(stored and stored.startswith(ENC_PREFIX))
