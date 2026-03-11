import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

import httpx

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, 
    create_access_token, create_refresh_token, decode_token
)
from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import (
    UserRegister, UserLogin, GoogleLoginRequest,
    UserResponse, TokenResponse, RefreshTokenRequest,
    ChangePasswordRequest
)

router = APIRouter()


def create_user_response(user: User) -> UserResponse:
    """Create UserResponse from User model."""
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        cpf=user.cpf,
        is_active=user.is_active,
        plan=user.plan,
        has_google=bool(user.google_id),
        created_at=user.created_at
    )


@router.post("/register", response_model=TokenResponse)
def register(
    user_data: UserRegister,
    db: DbSession
):
    """Register new user."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    # Check if CPF already exists
    if user_data.cpf:
        existing_cpf = db.query(User).filter(User.cpf == user_data.cpf).first()
        if existing_cpf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CPF já cadastrado"
            )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Handle Google token
    google_id = None
    if user_data.google_token:
        try:
            # Validate Google token
            response = httpx.get(
                f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={user_data.google_token}"
            )
            if response.status_code == 200:
                google_data = response.json()
                google_id = google_data.get("sub")
                
                # Check if Google ID already exists
                existing_google = db.query(User).filter(User.google_id == google_id).first()
                if existing_google:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Conta Google já vinculada a outro usuário"
                    )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token Google inválido"
            )
    
    # Create user
    user = User(
        email=user_data.email,
        full_name=user_data.name,
        cpf=user_data.cpf,
        hashed_password=hashed_password,
        google_id=google_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create default workspace
    workspace = Workspace(
        name="Workspace Padrão",
        owner_id=user.id
    )
    db.add(workspace)
    db.commit()
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=create_user_response(user)
    )


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: UserLogin,
    db: DbSession
):
    """Login user."""
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas"
        )
    
    # Verify password
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas"
        )
    
    # Create tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=create_user_response(user)
    )


@router.post("/login/google", response_model=TokenResponse)
def login_google(
    google_data: GoogleLoginRequest,
    db: DbSession
):
    """Login with Google."""
    try:
        # Validate Google token
        response = httpx.get(
            f"https://www.googleapis.com/oauth2/v3/tokeninfo?id_token={google_data.google_token}"
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token Google inválido"
            )
        
        google_info = response.json()
        google_id = google_info.get("sub")
        email = google_info.get("email")
        
        # Find user by Google ID
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if user:
            # User found by Google ID - login
            access_token = create_access_token({"sub": str(user.id)})
            refresh_token = create_refresh_token({"sub": str(user.id)})
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user=create_user_response(user)
            )
        
        # User not found by Google ID, check by email
        user = db.query(User).filter(User.email == email).first()
        if user:
            if not user.google_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vincule o Google no seu perfil antes de usar este login"
                )
        
        # User not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conta não encontrada. Faça o cadastro primeiro"
        )
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao validar token Google"
        )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: DbSession
):
    """Refresh access token."""
    # Decode refresh token
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido"
        )
    
    # Get user
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido"
        )
    
    # Create new tokens
    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=create_user_response(user)
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser):
    """Get current user info."""
    return create_user_response(current_user)


@router.post("/logout")
def logout():
    """Logout user."""
    return {"message": "logout realizado"}


@router.post("/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """Change user password."""
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta"
        )
    
    # Update password
    current_user.hashed_password = hash_password(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Senha alterada com sucesso"}


@router.post("/forgot-password")
def forgot_password(email_data: dict):
    """Send password reset email."""
    # Always return same message for security
    return {
        "message": "Se o email existir você receberá as instruções em breve"
    }
