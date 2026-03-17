import uuid
import os
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.minio import get_minio_client
from app.models.trade import Trade
from app.models.user import User
from app.schemas.screenshot import ScreenshotResponse
from app.dependencies import DbSession, CurrentUser, get_current_user

router = APIRouter()

@router.post("/upload/{trade_id}", response_model=ScreenshotResponse)
async def upload_screenshot(
    trade_id: str,
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...)
):
    # Validar que o trade pertence ao workspace do usuário
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )
    
    # Verificar se o usuário tem acesso ao workspace
    from app.models.workspace import WorkspaceMember
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == trade.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este trade"
        )
    
    # Validar tipo de arquivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apenas arquivos de imagem são permitidos"
        )
    
    # Gerar nome único para o arquivo
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Fazer upload para MinIO
    minio_client = get_minio_client()
    bucket_name = os.getenv("MINIO_BUCKET", "saas")
    object_name = f"screenshots/{trade.workspace_id}/{trade_id}/{unique_filename}"
    
    try:
        # Ler conteúdo do arquivo
        file_content = await file.read()
        
        # Fazer upload para MinIO
        minio_client.put_object(
            bucket_name=bucket_name,
            object_name=object_name,
            data=file_content,
            length=len(file_content),
            content_type=file.content_type
        )
        
        # Gerar URL pública
        url = f"https://{os.getenv('MINIO_ENDPOINT', 's3.painelzap.com')}/{bucket_name}/{object_name}"
        
        # Atualizar screenshots no trade
        if not trade.screenshots:
            trade.screenshots = []
        
        screenshot_data = {
            "id": str(uuid.uuid4()),
            "filename": unique_filename,
            "url": url,
            "created_at": datetime.utcnow().isoformat()
        }
        trade.screenshots.append(screenshot_data)
        db.commit()
        
        return ScreenshotResponse(
            id=screenshot_data["id"],
            trade_id=trade_id,
            url=url,
            filename=unique_filename,
            created_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload: {str(e)}"
        )

@router.delete("/{trade_id}/{filename}")
async def delete_screenshot(
    trade_id: str,
    filename: str,
    db: DbSession,
    current_user: CurrentUser
):
    # Validar que o trade pertence ao workspace do usuário
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )
    
    # Verificar se o usuário tem acesso ao workspace
    from app.models.workspace import WorkspaceMember
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == trade.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este trade"
        )
    
    # Remover arquivo do MinIO
    minio_client = get_minio_client()
    bucket_name = os.getenv("MINIO_BUCKET", "saas")
    object_name = f"screenshots/{trade.workspace_id}/{trade_id}/{filename}"
    
    try:
        minio_client.remove_object(bucket_name, object_name)
        
        # Remover da lista de screenshots
        if trade.screenshots:
            trade.screenshots = [
                s for s in trade.screenshots 
                if s.get("filename") != filename
            ]
            db.commit()
        
        return {"message": "Screenshot removido"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao remover screenshot: {str(e)}"
        )

@router.get("/{trade_id}", response_model=List[ScreenshotResponse])
async def list_screenshots(
    trade_id: str,
    db: DbSession,
    current_user: CurrentUser
):
    # Validar que o trade pertence ao workspace do usuário
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade não encontrado"
        )
    
    # Verificar se o usuário tem acesso ao workspace
    from app.models.workspace import WorkspaceMember
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == trade.workspace_id,
        WorkspaceMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sem acesso a este trade"
        )
    
    # Retornar lista de screenshots
    screenshots = []
    if trade.screenshots:
        for screenshot in trade.screenshots:
            screenshots.append(ScreenshotResponse(
                id=screenshot.get("id", ""),
                trade_id=trade_id,
                url=screenshot.get("url", ""),
                filename=screenshot.get("filename", ""),
                created_at=datetime.fromisoformat(screenshot.get("created_at", datetime.utcnow().isoformat()))
            ))
    
    return screenshots
