from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import httpx
import json

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileUpdate, ProfileResponse, PreferencesUpdate, PreferencesResponse
from app.schemas.plan import PlanResponse, PlansListResponse

router = APIRouter()


@router.get("/", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return ProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        cpf=current_user.cpf,
        phone=current_user.phone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        trading_style=current_user.trading_style,
        experience_level=current_user.experience_level,
        plan=current_user.plan,
        has_google=bool(current_user.google_id),
        created_at=current_user.created_at
    )


@router.patch("/", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    try:
        # Update only provided fields
        update_data = profile_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.commit()
        db.refresh(current_user)
        
        return ProfileResponse(
            id=str(current_user.id),
            email=current_user.email,
            full_name=current_user.full_name,
            cpf=current_user.cpf,
            phone=current_user.phone,
            bio=current_user.bio,
            avatar_url=current_user.avatar_url,
            trading_style=current_user.trading_style,
            experience_level=current_user.experience_level,
            plan=current_user.plan,
            has_google=bool(current_user.google_id),
            created_at=current_user.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile"
        )


@router.get("/preferences", response_model=PreferencesResponse)
def get_preferences(current_user: User = Depends(get_current_user)):
    """Get current user preferences"""
    return PreferencesResponse(
        theme=current_user.theme,
        language=current_user.language,
        currency=current_user.currency,
        timezone=current_user.timezone,
        notifications_email=current_user.notifications_email,
        notifications_push=current_user.notifications_push
    )


@router.patch("/preferences", response_model=PreferencesResponse)
def update_preferences(
    preferences_data: PreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user preferences"""
    try:
        # Update only provided fields
        update_data = preferences_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.commit()
        db.refresh(current_user)
        
        return PreferencesResponse(
            theme=current_user.theme,
            language=current_user.language,
            currency=current_user.currency,
            timezone=current_user.timezone,
            notifications_email=current_user.notifications_email,
            notifications_push=current_user.notifications_push
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update preferences"
        )


@router.get("/plans", response_model=PlansListResponse)
def get_plans(current_user: User = Depends(get_current_user)):
    """Get available plans"""
    plans = [
        PlanResponse(
            name="basic",
            price=47.0,
            max_accounts=2,
            features=[
                "Dashboard completo",
                "Calendário de trades",
                "Trade Log",
                "Contas Ativas"
            ]
        ),
        PlanResponse(
            name="intermediate",
            price=67.0,
            max_accounts=4,
            features=[
                "Tudo do Básico",
                "Evolução da Conta",
                "TradingView + Replay"
            ]
        ),
        PlanResponse(
            name="advanced",
            price=97.0,
            max_accounts=10,
            features=[
                "Tudo do Intermediário",
                "Análise das Operações",
                "IA do Trade",
                "Acesso às APIs"
            ]
        )
    ]
    
    return PlansListResponse(
        current_plan=current_user.plan,
        plans=plans
    )


@router.post("/google/connect")
def connect_google(
    request: Dict[str, str],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Connect Google account"""
    try:
        google_token = request.get("google_token")
        if not google_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google token is required"
            )
        
        # Validate token with Google API
        google_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        headers = {"Authorization": f"Bearer {google_token}"}
        
        response = httpx.get(google_info_url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google token"
            )
        
        google_data = response.json()
        google_id = google_data.get("id")
        
        if not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not get Google ID"
            )
        
        # Check if Google ID is already used by another user
        existing_user = db.query(User).filter(User.google_id == google_id).first()
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account already connected to another user"
            )
        
        # Update user with Google ID
        current_user.google_id = google_id
        db.commit()
        
        return {"message": "Google conectado"}
        
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to connect to Google"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to connect Google account"
        )


@router.delete("/google/disconnect")
def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google account"""
    try:
        current_user.google_id = None
        db.commit()
        
        return {"message": "Google desconectado"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to disconnect Google account"
        )
