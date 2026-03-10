"""Add broker_connections and symbols tables

Revision ID: 003
Revises: 002
Create Date: 2026-03-09 10:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create broker_connections table
    op.create_table(
        'broker_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('broker_type', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('environment', sa.String(length=20), nullable=False, default='live'),
        sa.Column('encrypted_credentials', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_sync_status', sa.String(length=20), nullable=True),
        sa.Column('last_sync_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_broker_connections_workspace_id', 'workspace_id'),
        sa.Index('ix_broker_connections_broker_type', 'broker_type'),
    )
    
    # Create broker_symbols table
    op.create_table(
        'broker_symbols',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('broker_connection_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('symbol', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('digits', sa.Integer(), nullable=False),
        sa.Column('point', sa.Numeric(precision=20, scale=10), nullable=False),
        sa.Column('tick_size', sa.Numeric(precision=20, scale=10), nullable=False),
        sa.Column('contract_size', sa.Numeric(precision=20, scale=2), nullable=False),
        sa.Column('min_lot', sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column('max_lot', sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column('lot_step', sa.Numeric(precision=20, scale=4), nullable=False),
        sa.Column('spread', sa.Integer(), nullable=True),
        sa.Column('is_tradeable', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['broker_connection_id'], ['broker_connections.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('broker_connection_id', 'symbol', name='uq_broker_connection_symbol'),
        sa.Index('ix_broker_symbols_broker_connection_id', 'broker_connection_id'),
        sa.Index('ix_broker_symbols_symbol', 'symbol'),
    )
    
    # Add broker_connection_id to trading_accounts table
    op.add_column('trading_accounts', sa.Column('broker_connection_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_trading_accounts_broker_connection_id',
        'trading_accounts', 'broker_connections',
        ['broker_connection_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_trading_accounts_broker_connection_id', 'trading_accounts', ['broker_connection_id'])
    
    # Add sync_status to trading_accounts table
    op.add_column('trading_accounts', sa.Column('sync_status', sa.String(length=20), nullable=True))
    op.add_column('trading_accounts', sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('trading_accounts', sa.Column('sync_error', sa.Text(), nullable=True))
    
    # Update trading_accounts to use broker_connection_id instead of external_account_id
    op.alter_column('trading_accounts', 'external_account_id', nullable=True)


def downgrade() -> None:
    # Remove broker_connection_id from trading_accounts
    op.drop_index('ix_trading_accounts_broker_connection_id', table_name='trading_accounts')
    op.drop_constraint('fk_trading_accounts_broker_connection_id', table_name='trading_accounts', type_='foreignkey')
    op.drop_column('trading_accounts', 'broker_connection_id')
    
    # Remove sync columns from trading_accounts
    op.drop_column('trading_accounts', 'sync_error')
    op.drop_column('trading_accounts', 'last_sync_at')
    op.drop_column('trading_accounts', 'sync_status')
    
    # Restore external_account_id as not nullable
    op.alter_column('trading_accounts', 'external_account_id', nullable=False)
    
    # Drop broker_symbols table
    op.drop_table('broker_symbols')
    
    # Drop broker_connections table
    op.drop_table('broker_connections')
