"""Add market data and replay system tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-09 11:25:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create market_data_sources table
    op.create_table(
        'market_data_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('source_type', sa.String(length=50), nullable=False),
        sa.Column('symbol_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('file_path', sa.String(length=1024), nullable=True),
        sa.Column('broker_connection_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('last_import_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_ticks', sa.Integer(), nullable=False, default=0),
        sa.Column('total_candles', sa.Integer(), nullable=False, default=0),
        sa.Column('date_range_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('date_range_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['symbol_id'], ['broker_symbols.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['broker_connection_id'], ['broker_connections.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_market_data_sources_workspace_id', 'workspace_id'),
        sa.Index('ix_market_data_sources_symbol_id', 'symbol_id'),
    )
    
    # Create ticks table
    op.create_table(
        'ticks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('symbol_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('bid', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('ask', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('volume', sa.Integer(), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['symbol_id'], ['broker_symbols.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['market_data_sources.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_ticks_symbol_id', 'symbol_id'),
        sa.Index('ix_ticks_timestamp', 'timestamp'),
        sa.UniqueConstraint('symbol_id', 'timestamp', name='uq_tick_symbol_timestamp'),
    )
    
    # Create candles table
    op.create_table(
        'candles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('symbol_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timeframe', sa.String(length=10), nullable=False),
        sa.Column('open_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('close_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('open_price', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('high_price', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('low_price', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('close_price', sa.Numeric(precision=20, scale=5), nullable=False),
        sa.Column('volume', sa.Integer(), nullable=True),
        sa.Column('tick_volume', sa.Integer(), nullable=True),
        sa.Column('spread', sa.Integer(), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['symbol_id'], ['broker_symbols.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_id'], ['market_data_sources.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_candles_symbol_id', 'symbol_id'),
        sa.Index('ix_candles_open_time', 'open_time'),
        sa.UniqueConstraint('symbol_id', 'timeframe', 'open_time', name='uq_candle_symbol_timeframe_time'),
    )
    
    # Create replay_sessions table
    op.create_table(
        'replay_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('symbol_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timeframe', sa.String(length=10), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False, default='real_time'),
        sa.Column('status', sa.String(length=20), nullable=False, default='created'),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('speed', sa.Numeric(precision=5, scale=2), nullable=False, default=1.0),
        sa.Column('auto_step', sa.Boolean(), nullable=False, default=True),
        sa.Column('step_interval', sa.Integer(), nullable=False, default=1000),
        sa.Column('total_ticks', sa.Integer(), nullable=False, default=0),
        sa.Column('processed_ticks', sa.Integer(), nullable=False, default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['symbol_id'], ['broker_symbols.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_replay_sessions_workspace_id', 'workspace_id'),
        sa.Index('ix_replay_sessions_user_id', 'user_id'),
        sa.Index('ix_replay_sessions_symbol_id', 'symbol_id'),
    )


def downgrade() -> None:
    # Drop replay_sessions table
    op.drop_table('replay_sessions')
    
    # Drop candles table
    op.drop_table('candles')
    
    # Drop ticks table
    op.drop_table('ticks')
    
    # Drop market_data_sources table
    op.drop_table('market_data_sources')
