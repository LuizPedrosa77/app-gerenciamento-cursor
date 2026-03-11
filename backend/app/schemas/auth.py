from datetime import datetime
from typing import Optional
from pydantic import EmailStr, Field, BaseModel


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    cpf: Optional[str] = None
    password: str = Field(..., min_length=6)
    google_token: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    google_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    cpf: Optional[str]
    is_active: bool
    plan: str
    has_google: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
