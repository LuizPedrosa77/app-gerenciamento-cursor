from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember

router = APIRouter()


class MemberInvite(BaseModel):
    email: EmailStr
    role: str = "member"


@router.get("/members")
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")

    members = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace.id
    ).all()
    result = [{
        "user_id": str(current_user.id),
        "email": current_user.email,
        "role": "owner",
    }]
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "user_id": str(user.id),
                "email": user.email,
                "role": m.role,
            })
    return {"members": result}


@router.post("/members")
def invite_member(
    invite: MemberInvite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace não encontrado")

    user = db.query(User).filter(User.email == invite.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado. Peça para criar conta primeiro.")

    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Usuário já é membro do workspace")

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=invite.role,
    )
    db.add(member)
    db.commit()
    return {"message": "Membro adicionado", "email": user.email, "role": invite.role}
