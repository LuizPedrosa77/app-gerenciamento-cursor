"""Add calendar_events table for persistent calendar events

Revision ID: 007
Revises: 006
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create calendar_events table
    op.execute("""
        CREATE TABLE IF NOT EXISTS calendar_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            account_id UUID REFERENCES accounts(id),
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            event_date DATE NOT NULL,
            event_type VARCHAR(50) DEFAULT 'reminder',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create indexes for performance
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id 
        ON calendar_events(user_id)
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_calendar_events_account_id 
        ON calendar_events(account_id)
    """)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date 
        ON calendar_events(event_date)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_calendar_events_event_date")
    op.execute("DROP INDEX IF EXISTS idx_calendar_events_account_id")
    op.execute("DROP INDEX IF EXISTS idx_calendar_events_user_id")
    op.execute("DROP TABLE IF EXISTS calendar_events")
