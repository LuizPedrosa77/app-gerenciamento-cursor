"""
Domain services for business logic.
"""

from .account_service import (
    create_account,
    delete_account,
    get_account,
    list_accounts,
    update_account,
)
from .auth_service import (
    login as auth_login,
    refresh_tokens,
    register,
)
from .broker_service import (
    create_broker_adapter,
    create_connection,
    delete_connection,
    get_account_info,
    get_available_brokers,
    list_connections,
    sync_history,
    test_connection,
)
from .market_data_service import (
    create_market_data_source,
    create_replay_session,
    delete_replay_session,
    get_candles,
    get_market_data_sources,
    get_replay_session,
    get_ticks,
    import_from_csv,
    list_replay_sessions,
    save_candle,
    save_tick,
    update_replay_session,
)
from .storage_service import (
    delete_screenshot,
    get_screenshot_url,
    upload_screenshot,
)
from .trade_service import (
    create_daily_note,
    create_trade,
    create_withdrawal,
    delete_daily_note,
    delete_trade,
    delete_withdrawal,
    get_daily_note,
    get_daily_note_by_date,
    get_daily_note_by_id,
    get_trade,
    list_daily_notes,
    list_trades,
    list_withdrawals,
    update_daily_note,
    update_trade,
)

__all__ = [
    # Account service
    "create_account",
    "delete_account", 
    "get_account",
    "list_accounts",
    "update_account",
    # Auth service
    "auth_login",
    "refresh_tokens",
    "register",
    # Broker service
    "create_broker_adapter",
    "create_connection",
    "delete_connection",
    "get_account_info",
    "get_available_brokers",
    "list_connections",
    "sync_history",
    "test_connection",
    # Market data service
    "create_market_data_source",
    "create_replay_session",
    "delete_replay_session",
    "get_candles",
    "get_market_data_sources",
    "get_replay_session",
    "get_ticks",
    "import_from_csv",
    "list_replay_sessions",
    "save_candle",
    "save_tick",
    "update_replay_session",
    # Storage service
    "delete_screenshot",
    "get_screenshot_url",
    "upload_screenshot",
    # Trade service
    "create_daily_note",
    "create_trade",
    "create_withdrawal",
    "delete_daily_note",
    "delete_trade",
    "delete_withdrawal",
    "get_daily_note",
    "get_daily_note_by_date",
    "get_daily_note_by_id",
    "get_trade",
    "list_daily_notes",
    "list_trades",
    "list_withdrawals",
    "update_daily_note",
    "update_trade",
]
