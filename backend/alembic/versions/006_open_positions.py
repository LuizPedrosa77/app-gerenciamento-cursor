"""create open_positions table for realtime dashboard block

Revision ID: 006_open_positions
Revises: 005_trade_execution_fields
Create Date: 2026-03-23 10:30:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "006_open_positions"
down_revision = "005_trade_execution_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS open_positions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            ticket VARCHAR(64) NOT NULL,
            symbol_raw VARCHAR(40),
            symbol_normalized VARCHAR(20),
            direction VARCHAR(10),
            lots NUMERIC(10,2),
            open_time TIMESTAMP,
            open_price NUMERIC(18,8),
            floating_pnl NUMERIC(15,2) NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_open_positions_account_ticket UNIQUE (account_id, ticket)
        )
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_open_positions_workspace_id
        ON open_positions (workspace_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_open_positions_account_id
        ON open_positions (account_id)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_open_positions_symbol_normalized
        ON open_positions (symbol_normalized)
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS open_positions")
