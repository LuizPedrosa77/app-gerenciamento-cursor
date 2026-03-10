"""Add frontend compatibility fields and goals

Revision ID: 005
Revises: 004
Create Date: 2025-01-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add goal fields to trading_accounts
    op.add_column('trading_accounts', sa.Column('monthly_goal_amount', postgresql.NUMERIC(precision=20, scale=2), server_default='0', nullable=False))
    op.add_column('trading_accounts', sa.Column('biweekly_goal_amount', postgresql.NUMERIC(precision=20, scale=2), server_default='0', nullable=False))
    
    # Add VM and frontend compatibility fields to trades
    op.add_column('trades', sa.Column('has_vm', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('trades', sa.Column('vm_lots', postgresql.NUMERIC(precision=20, scale=4), server_default='0', nullable=False))
    op.add_column('trades', sa.Column('vm_result', sa.String(length=10), server_default='WIN', nullable=False))
    op.add_column('trades', sa.Column('vm_net_profit', postgresql.NUMERIC(precision=20, scale=2), server_default='0', nullable=False))
    
    # Frontend compatibility fields
    op.add_column('trades', sa.Column('pnl', postgresql.NUMERIC(precision=20, scale=2), server_default='0', nullable=False))
    op.add_column('trades', sa.Column('pair', sa.String(length=50), nullable=False))
    op.add_column('trades', sa.Column('dir', sa.String(length=10), nullable=False))
    op.add_column('trades', sa.Column('lots', postgresql.NUMERIC(precision=20, scale=4), nullable=False))
    op.add_column('trades', sa.Column('result', sa.String(length=10), server_default='WIN', nullable=False))
    op.add_column('trades', sa.Column('date', sa.String(length=20), nullable=True))
    op.add_column('trades', sa.Column('year', sa.Integer(), nullable=True))
    op.add_column('trades', sa.Column('month', sa.Integer(), nullable=True))
    
    # Create indexes for new fields
    op.create_index('ix_trades_year', 'trades', ['year'])
    op.create_index('ix_trades_month', 'trades', ['month'])
    op.create_index('ix_trades_date', 'trades', ['date'])
    op.create_index('ix_trades_pair', 'trades', ['pair'])
    op.create_index('ix_trades_result', 'trades', ['result'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_trades_result', table_name='trades')
    op.drop_index('ix_trades_pair', table_name='trades')
    op.drop_index('ix_trades_date', table_name='trades')
    op.drop_index('ix_trades_month', table_name='trades')
    op.drop_index('ix_trades_year', table_name='trades')
    
    # Drop columns
    op.drop_column('trades', 'month')
    op.drop_column('trades', 'year')
    op.drop_column('trades', 'date')
    op.drop_column('trades', 'result')
    op.drop_column('trades', 'lots')
    op.drop_column('trades', 'dir')
    op.drop_column('trades', 'pair')
    op.drop_column('trades', 'pnl')
    op.drop_column('trades', 'vm_net_profit')
    op.drop_column('trades', 'vm_result')
    op.drop_column('trades', 'vm_lots')
    op.drop_column('trades', 'has_vm')
    op.drop_column('trading_accounts', 'biweekly_goal_amount')
    op.drop_column('trading_accounts', 'monthly_goal_amount')
