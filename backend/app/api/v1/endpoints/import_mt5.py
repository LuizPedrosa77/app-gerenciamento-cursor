import uuid
import io
import pandas as pd
from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace
from app.models.account import Account
from app.models.trade import Trade
from app.schemas.import_mt5 import ImportResult

router = APIRouter()


@router.post("/mt5/{account_id}", response_model=ImportResult)
def import_mt5_trades(
    account_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validar que a conta pertence ao workspace do usuário
    workspace = db.query(Workspace).filter(Workspace.owner_id == current_user.id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.workspace_id == workspace.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found or does not belong to your workspace")
    
    # Validar tipo de arquivo
    if not file.filename or (not file.filename.endswith('.csv') and not file.filename.endswith('.xlsx')):
        raise HTTPException(status_code=400, detail="File must be .csv or .xlsx")
    
    errors = []
    imported_count = 0
    skipped_count = 0
    total_pnl = 0
    
    try:
        # Ler arquivo
        content = file.file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        total_count = len(df)
        
        # Mapear colunas
        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower().strip()
            if col_lower in ['time', 'open time']:
                column_mapping['date'] = col
            elif col_lower == 'symbol':
                column_mapping['pair'] = col
            elif col_lower == 'type':
                column_mapping['direction'] = col
            elif col_lower == 'volume':
                column_mapping['lots'] = col
            elif col_lower == 'profit':
                column_mapping['pnl'] = col
        
        # Verificar colunas obrigatórias
        required_cols = ['date', 'pair', 'direction', 'lots', 'pnl']
        missing_cols = [col for col in required_cols if col not in column_mapping]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing required columns: {missing_cols}")
        
        # Processar cada linha
        for index, row in df.iterrows():
            try:
                # Extrair dados
                date_value = row[column_mapping['date']]
                pair = str(row[column_mapping['pair']]).strip()
                direction = str(row[column_mapping['direction']]).strip().upper()
                lots = float(row[column_mapping['lots']])
                pnl = float(row[column_mapping['pnl']])
                
                # Converter data
                if isinstance(date_value, str):
                    try:
                        trade_date = datetime.strptime(date_value, '%Y-%m-%d %H:%M:%S').date()
                    except ValueError:
                        try:
                            trade_date = datetime.strptime(date_value, '%Y.%m.%d %H:%M:%S').date()
                        except ValueError:
                            errors.append(f"Row {index + 1}: Invalid date format")
                            continue
                else:
                    trade_date = pd.to_datetime(date_value).date()
                
                # Mapear direction
                if direction in ['BUY', 'SELL']:
                    direction_mapped = direction
                else:
                    errors.append(f"Row {index + 1}: Invalid direction '{direction}'")
                    continue
                
                # Mapear result
                if pnl > 0:
                    result = "WIN"
                elif pnl < 0:
                    result = "LOSS"
                else:
                    result = "BE"
                
                # Extrair year e month
                year = trade_date.year
                month = trade_date.month
                
                # Verificar duplicata
                existing_trade = db.query(Trade).filter(
                    Trade.account_id == account_id,
                    Trade.date == trade_date,
                    Trade.pair == pair,
                    Trade.lots == lots,
                    Trade.pnl == pnl
                ).first()
                
                if existing_trade:
                    skipped_count += 1
                    continue
                
                # Criar trade
                new_trade = Trade(
                    account_id=account_id,
                    workspace_id=workspace.id,
                    date=trade_date,
                    year=year,
                    month=month,
                    pair=pair,
                    direction=direction_mapped,
                    lots=lots,
                    result=result,
                    pnl=pnl
                )
                
                db.add(new_trade)
                imported_count += 1
                total_pnl += pnl
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
                continue
        
        # Atualizar balance da conta
        if imported_count > 0:
            account.balance += total_pnl
            db.commit()
        
        return ImportResult(
            total=total_count,
            imported=imported_count,
            skipped=skipped_count,
            errors=errors
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
