"""add trade execution fields for chart/replay foundation

Revision ID: 005_trade_execution_fields
Revises: 004_user_profile_fields
Create Date: 2026-03-17 11:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "005_trade_execution_fields"
down_revision = "004_user_profile_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trades", sa.Column("symbol_raw", sa.String(length=40), nullable=True))
    op.add_column("trades", sa.Column("symbol_normalized", sa.String(length=20), nullable=True))
    op.add_column("trades", sa.Column("ticket", sa.String(length=64), nullable=True))
    op.add_column("trades", sa.Column("open_time", sa.DateTime(), nullable=True))
    op.add_column("trades", sa.Column("close_time", sa.DateTime(), nullable=True))
    op.add_column("trades", sa.Column("open_price", sa.Numeric(precision=18, scale=8), nullable=True))
    op.add_column("trades", sa.Column("close_price", sa.Numeric(precision=18, scale=8), nullable=True))

    op.create_index("ix_trades_symbol_raw", "trades", ["symbol_raw"], unique=False)
    op.create_index("ix_trades_symbol_normalized", "trades", ["symbol_normalized"], unique=False)
    op.create_index("ix_trades_ticket", "trades", ["ticket"], unique=False)
    op.create_index("ix_trades_open_time", "trades", ["open_time"], unique=False)
    op.create_index("ix_trades_close_time", "trades", ["close_time"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_trades_close_time", table_name="trades")
    op.drop_index("ix_trades_open_time", table_name="trades")
    op.drop_index("ix_trades_ticket", table_name="trades")
    op.drop_index("ix_trades_symbol_normalized", table_name="trades")
    op.drop_index("ix_trades_symbol_raw", table_name="trades")

    op.drop_column("trades", "close_price")
    op.drop_column("trades", "open_price")
    op.drop_column("trades", "close_time")
    op.drop_column("trades", "open_time")
    op.drop_column("trades", "ticket")
    op.drop_column("trades", "symbol_normalized")
    op.drop_column("trades", "symbol_raw")
