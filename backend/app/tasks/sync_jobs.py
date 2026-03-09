"""
Background sync jobs for n8n integration.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_session
from app.models import BrokerConnection, Trade, TradingAccount
from app.services import broker_service

logger = logging.getLogger(__name__)


async def sync_account_history(
    account_id: str,
    workspace_id: str,
    days_back: int = 30,
    force_sync: bool = False,
) -> Dict[str, Any]:
    """
    Sync trade history for a specific account.
    
    Args:
        account_id: Trading account ID
        workspace_id: Workspace ID
        days_back: Number of days to sync back
        force_sync: Force sync even if recently synced
    
    Returns:
        Dict with sync results and statistics
    """
    try:
        # Get database session
        async for db in get_async_session():
            # Get account with broker connection
            account_query = (
                select(TradingAccount)
                .options(selectinload(TradingAccount.broker_connection))
                .where(
                    and_(
                        TradingAccount.id == account_id,
                        TradingAccount.workspace_id == workspace_id,
                    )
                )
            )
            
            result = await db.execute(account_query)
            account = result.scalar_one_or_none()
            
            if not account:
                return {
                    "success": False,
                    "error": "Account not found",
                    "account_id": account_id,
                }
            
            # Check if account has broker connection
            if not account.broker_connection:
                return {
                    "success": False,
                    "error": "No broker connection found for account",
                    "account_id": account_id,
                }
            
            # Check if recently synced (unless forced)
            if not force_sync and account.last_sync_at:
                hours_since_sync = (datetime.now(timezone.utc) - account.last_sync_at).total_seconds() / 3600
                if hours_since_sync < 1:  # Less than 1 hour ago
                    return {
                        "success": True,
                        "message": "Account synced recently",
                        "account_id": account_id,
                        "last_sync_at": account.last_sync_at.isoformat(),
                        "hours_since_sync": round(hours_since_sync, 2),
                    }
            
            # Get broker connection details
            broker_conn = account.broker_connection
            
            # Decrypt credentials
            try:
                credentials = broker_service.decrypt_credentials(broker_conn.encrypted_credentials)
            except Exception as e:
                logger.error(f"Failed to decrypt credentials for account {account_id}: {str(e)}")
                return {
                    "success": False,
                    "error": "Failed to decrypt broker credentials",
                    "account_id": account_id,
                }
            
            # Create broker adapter
            try:
                adapter = broker_service.create_broker_adapter(broker_conn.broker_type, credentials)
            except Exception as e:
                logger.error(f"Failed to create broker adapter for account {account_id}: {str(e)}")
                return {
                    "success": False,
                    "error": f"Failed to create broker adapter: {str(e)}",
                    "account_id": account_id,
                }
            
            # Calculate sync date range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days_back)
            
            # If account has existing trades, sync from last trade date
            last_trade_query = (
                select(Trade)
                .where(
                    and_(
                        Trade.account_id == account_id,
                        Trade.workspace_id == workspace_id,
                    )
                )
                .order_by(Trade.open_time.desc())
                .limit(1)
            )
            
            last_trade_result = await db.execute(last_trade_query)
            last_trade = last_trade_result.scalar_one_or_none()
            
            if last_trade and not force_sync:
                # Sync from 1 day before last trade to catch any missed trades
                start_date = last_trade.open_time - timedelta(days=1)
            
            # Connect to broker and sync trades
            try:
                await adapter.connect()
                broker_trades = await adapter.sync_history(start_date, end_date)
            except Exception as e:
                logger.error(f"Failed to sync trades from broker for account {account_id}: {str(e)}")
                return {
                    "success": False,
                    "error": f"Failed to sync from broker: {str(e)}",
                    "account_id": account_id,
                }
            finally:
                try:
                    await adapter.disconnect()
                except:
                    pass
            
            # Process and save new trades
            new_trades = 0
            updated_trades = 0
            errors = []
            
            for broker_trade in broker_trades:
                try:
                    # Check if trade already exists
                    existing_trade_query = (
                        select(Trade)
                        .where(
                            and_(
                                Trade.account_id == account_id,
                                Trade.external_id == broker_trade.external_id,
                            )
                        )
                    )
                    
                    existing_result = await db.execute(existing_trade_query)
                    existing_trade = existing_result.scalar_one_or_none()
                    
                    if existing_trade:
                        # Update existing trade
                        existing_trade.symbol = broker_trade.symbol
                        existing_trade.side = broker_trade.side
                        existing_trade.volume = broker_trade.volume
                        existing_trade.open_time = broker_trade.open_time
                        existing_trade.close_time = broker_trade.close_time
                        existing_trade.open_price = broker_trade.open_price
                        existing_trade.close_price = broker_trade.close_price
                        existing_trade.stop_loss = broker_trade.stop_loss
                        existing_trade.take_profit = broker_trade.take_profit
                        existing_trade.commission = broker_trade.commission
                        existing_trade.swap = broker_trade.swap
                        existing_trade.profit = broker_trade.profit
                        existing_trade.status = broker_trade.status
                        existing_trade.comment = broker_trade.comment
                        existing_trade.magic_number = broker_trade.magic_number
                        existing_trade.strategy_name = broker_trade.strategy_name
                        existing_trade.updated_at = datetime.now(timezone.utc)
                        
                        updated_trades += 1
                    else:
                        # Create new trade
                        new_trade = Trade(
                            workspace_id=workspace_id,
                            account_id=account_id,
                            external_id=broker_trade.external_id,
                            symbol=broker_trade.symbol,
                            side=broker_trade.side,
                            volume=broker_trade.volume,
                            open_time=broker_trade.open_time,
                            close_time=broker_trade.close_time,
                            open_price=broker_trade.open_price,
                            close_price=broker_trade.close_price,
                            stop_loss=broker_trade.stop_loss,
                            take_profit=broker_trade.take_profit,
                            commission=broker_trade.commission,
                            swap=broker_trade.swap,
                            profit=broker_trade.profit,
                            status=broker_trade.status,
                            comment=broker_trade.comment,
                            magic_number=broker_trade.magic_number,
                            strategy_name=broker_trade.strategy_name,
                        )
                        
                        db.add(new_trade)
                        new_trades += 1
                
                except Exception as e:
                    error_msg = f"Failed to process trade {broker_trade.external_id}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            # Update account sync status
            account.last_sync_at = datetime.now(timezone.utc)
            account.sync_status = "completed"
            account.sync_error = None
            
            # Update account balance if available
            if broker_trades:
                # Get latest balance from broker
                try:
                    await adapter.connect()
                    account_info = await adapter.get_account_info()
                    account.current_balance = account_info.balance
                except Exception as e:
                    logger.warning(f"Failed to get updated balance for account {account_id}: {str(e)}")
                finally:
                    try:
                        await adapter.disconnect()
                    except:
                        pass
            
            await db.commit()
            
            return {
                "success": True,
                "account_id": account_id,
                "broker_type": broker_conn.broker_type,
                "sync_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days_back": days_back,
                },
                "results": {
                    "new_trades": new_trades,
                    "updated_trades": updated_trades,
                    "total_processed": len(broker_trades),
                    "errors": len(errors),
                },
                "last_sync_at": account.last_sync_at.isoformat(),
                "errors": errors[:10],  # Limit errors in response
            }
    
    except Exception as e:
        logger.error(f"Unexpected error in sync_account_history for {account_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "account_id": account_id,
        }


async def sync_all_accounts(
    workspace_id: str,
    days_back: int = 30,
    force_sync: bool = False,
) -> Dict[str, Any]:
    """
    Sync all active accounts in a workspace.
    
    Args:
        workspace_id: Workspace ID
        days_back: Number of days to sync back
        force_sync: Force sync even if recently synced
    
    Returns:
        Dict with overall sync results
    """
    try:
        async for db in get_async_session():
            # Get all active accounts with broker connections
            accounts_query = (
                select(TradingAccount)
                .options(selectinload(TradingAccount.broker_connection))
                .where(
                    and_(
                        TradingAccount.workspace_id == workspace_id,
                        TradingAccount.is_active == True,
                    )
                )
            )
            
            result = await db.execute(accounts_query)
            accounts = result.scalars().all()
            
            if not accounts:
                return {
                    "success": True,
                    "message": "No active accounts found",
                    "workspace_id": workspace_id,
                    "results": {
                        "total_accounts": 0,
                        "synced": 0,
                        "failed": 0,
                    },
                }
            
            # Sync each account
            results = {
                "total_accounts": len(accounts),
                "synced": 0,
                "failed": 0,
                "account_results": [],
            }
            
            for account in accounts:
                if not account.broker_connection:
                    # Skip accounts without broker connections
                    results["account_results"].append({
                        "account_id": str(account.id),
                        "account_name": account.name,
                        "success": False,
                        "error": "No broker connection",
                    })
                    results["failed"] += 1
                    continue
                
                # Sync individual account
                sync_result = await sync_account_history(
                    str(account.id),
                    workspace_id,
                    days_back=days_back,
                    force_sync=force_sync,
                )
                
                sync_result["account_name"] = account.name
                results["account_results"].append(sync_result)
                
                if sync_result["success"]:
                    results["synced"] += 1
                else:
                    results["failed"] += 1
            
            return {
                "success": True,
                "workspace_id": workspace_id,
                "sync_period": {
                    "days_back": days_back,
                    "force_sync": force_sync,
                },
                "results": results,
            }
    
    except Exception as e:
        logger.error(f"Unexpected error in sync_all_accounts for workspace {workspace_id}: {str(e)}")
        return {
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "workspace_id": workspace_id,
        }


async def sync_market_data(
    symbol: str,
    timeframe: str,
    days_back: int = 30,
    workspace_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sync historical market data for a symbol.
    
    Args:
        symbol: Symbol to sync (e.g., "EUR/USD")
        timeframe: Timeframe (e.g., "M1", "H1", "D1")
        days_back: Number of days of historical data
        workspace_id: Workspace ID (optional, for logging)
    
    Returns:
        Dict with sync results
    """
    try:
        # This is a placeholder for market data sync
        # In a real implementation, this would:
        # 1. Query external data source (broker API, data provider, etc.)
        # 2. Parse and validate the data
        # 3. Save to market_data tables (ticks, candles)
        # 4. Update market_data_sources
        
        logger.info(f"Market data sync requested for {symbol} {timeframe} ({days_back} days)")
        
        # Mock implementation
        return {
            "success": True,
            "symbol": symbol,
            "timeframe": timeframe,
            "sync_period": {
                "days_back": days_back,
                "start_date": (datetime.now(timezone.utc) - timedelta(days=days_back)).isoformat(),
                "end_date": datetime.now(timezone.utc).isoformat(),
            },
            "results": {
                "ticks_imported": 0,
                "candles_imported": 0,
                "errors": [],
            },
            "message": "Market data sync not implemented yet - placeholder response",
        }
    
    except Exception as e:
        logger.error(f"Error in sync_market_data for {symbol}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "symbol": symbol,
            "timeframe": timeframe,
        }


async def cleanup_old_sync_logs(
    days_to_keep: int = 30,
) -> Dict[str, Any]:
    """
    Clean up old sync logs and temporary data.
    
    Args:
        days_to_keep: Number of days to keep logs
    
    Returns:
        Dict with cleanup results
    """
    try:
        # This is a placeholder for cleanup operations
        # In a real implementation, this would:
        # 1. Clean up old sync logs from logging system
        # 2. Remove temporary files
        # 3. Archive old data
        
        logger.info(f"Cleanup requested - keeping {days_to_keep} days of logs")
        
        return {
            "success": True,
            "cleanup_period": {
                "days_to_keep": days_to_keep,
                "cutoff_date": (datetime.now(timezone.utc) - timedelta(days=days_to_keep)).isoformat(),
            },
            "results": {
                "logs_cleaned": 0,
                "files_removed": 0,
                "space_freed_mb": 0,
            },
            "message": "Cleanup not implemented yet - placeholder response",
        }
    
    except Exception as e:
        logger.error(f"Error in cleanup_old_sync_logs: {str(e)}")
        return {
            "success": False,
            "error": str(e),
        }


# Helper function for selectinload
from sqlalchemy.orm import selectinload
