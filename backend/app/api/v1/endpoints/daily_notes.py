from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.dependencies import DbSession, CurrentUser
from app.models.user import User
from app.models.daily_note import DailyNote
from app.models.account import Account
from app.models.workspace import Workspace
from app.schemas.daily_note import DailyNoteCreate, DailyNoteUpdate, DailyNoteResponse

router = APIRouter()


def create_daily_note_response(daily_note: DailyNote) -> DailyNoteResponse:
    """Create DailyNoteResponse from DailyNote model."""
    return DailyNoteResponse(
        id=str(daily_note.id),
        date=daily_note.date,
        note=daily_note.note,
        account_id=str(daily_note.account_id),
        created_at=daily_note.created_at,
        updated_at=daily_note.updated_at
    )


@router.get("", response_model=List[DailyNoteResponse])
def get_daily_notes(
    current_user: CurrentUser,
    db: DbSession,
    account_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None)
):
    """Get daily notes from user's workspace."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        return []
    
    # Build query
    query = db.query(DailyNote).filter(DailyNote.workspace_id == workspace.id)
    
    if account_id:
        query = query.filter(DailyNote.account_id == account_id)
    
    if year and month:
        query = query.filter(
            DailyNote.date.between(
                date(year, month, 1),
                date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)
            )
        )
    elif year:
        query = query.filter(
            DailyNote.date.between(
                date(year, 1, 1),
                date(year + 1, 1, 1)
            )
        )
    
    daily_notes = query.order_by(DailyNote.date.desc()).all()
    return [create_daily_note_response(note) for note in daily_notes]


@router.post("", response_model=DailyNoteResponse)
def create_or_update_daily_note(
    note_data: DailyNoteCreate,
    current_user: CurrentUser,
    db: DbSession
):
    """Create or update daily note."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Verify account belongs to workspace
    account = db.query(Account).filter(
        and_(Account.id == note_data.account_id, Account.workspace_id == workspace.id)
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check if note already exists for this date and account
    existing_note = db.query(DailyNote).filter(
        and_(
            DailyNote.account_id == note_data.account_id,
            DailyNote.date == note_data.date,
            DailyNote.workspace_id == workspace.id
        )
    ).first()
    
    if existing_note:
        # Update existing note
        existing_note.note = note_data.note
        existing_note.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_note)
        return create_daily_note_response(existing_note)
    else:
        # Create new note
        daily_note = DailyNote(
            date=note_data.date,
            note=note_data.note,
            account_id=note_data.account_id,
            workspace_id=workspace.id
        )
        db.add(daily_note)
        db.commit()
        db.refresh(daily_note)
        return create_daily_note_response(daily_note)


@router.get("/{note_id}", response_model=DailyNoteResponse)
def get_daily_note(
    note_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Get specific daily note."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get note
    daily_note = db.query(DailyNote).filter(
        and_(DailyNote.id == note_id, DailyNote.workspace_id == workspace.id)
    ).first()
    
    if not daily_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily note not found"
        )
    
    return create_daily_note_response(daily_note)


@router.patch("/{note_id}", response_model=DailyNoteResponse)
def update_daily_note(
    note_id: str,
    note_data: DailyNoteUpdate,
    current_user: CurrentUser,
    db: DbSession
):
    """Update daily note."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get note
    daily_note = db.query(DailyNote).filter(
        and_(DailyNote.id == note_id, DailyNote.workspace_id == workspace.id)
    ).first()
    
    if not daily_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily note not found"
        )
    
    # Update note
    daily_note.note = note_data.note
    daily_note.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(daily_note)
    
    return create_daily_note_response(daily_note)


@router.delete("/{note_id}")
def delete_daily_note(
    note_id: str,
    current_user: CurrentUser,
    db: DbSession
):
    """Delete daily note."""
    # Get user's workspace
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get note
    daily_note = db.query(DailyNote).filter(
        and_(DailyNote.id == note_id, DailyNote.workspace_id == workspace.id)
    ).first()
    
    if not daily_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Daily note not found"
        )
    
    # Delete note
    db.delete(daily_note)
    db.commit()
    
    return {"message": "Nota removida"}
