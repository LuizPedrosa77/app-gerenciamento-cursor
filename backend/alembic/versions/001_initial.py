"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            cpf VARCHAR(14) UNIQUE,
            hashed_password VARCHAR(255) NOT NULL,
            google_id VARCHAR(255) UNIQUE NULL,
            is_active BOOLEAN DEFAULT TRUE,
            is_superuser BOOLEAN DEFAULT FALSE,
            plan VARCHAR(50) DEFAULT 'basic',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            phone VARCHAR(20) NULL,
            bio TEXT NULL,
            avatar_url TEXT NULL,
            trading_style VARCHAR(50) NULL,
            experience_level VARCHAR(50) NULL,
            theme VARCHAR(20) DEFAULT 'dark',
            language VARCHAR(10) DEFAULT 'pt-BR',
            currency VARCHAR(10) DEFAULT 'USD',
            timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
            notifications_email BOOLEAN DEFAULT true,
            notifications_push BOOLEAN DEFAULT true
        )
    """)

    # Create workspaces table
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255),
            owner_id UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create workspace_members table
    op.execute("""
        CREATE TABLE IF NOT EXISTS workspace_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id),
            user_id UUID NOT NULL REFERENCES users(id),
            role VARCHAR(50) DEFAULT 'member'
        )
    """)

    # Create accounts table
    op.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id),
            name VARCHAR(255),
            balance NUMERIC(15,2) DEFAULT 0,
            initial_balance NUMERIC(15,2) DEFAULT 0,
            monthly_goal NUMERIC(15,2),
            meta NUMERIC(15,2),
            notes TEXT,
            broker_type VARCHAR(50) NULL,
            broker_login VARCHAR(100) NULL,
            broker_server VARCHAR(100) NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create trades table
    op.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id),
            workspace_id UUID NOT NULL REFERENCES workspaces(id),
            date DATE NOT NULL,
            year INTEGER,
            month INTEGER,
            pair VARCHAR(20),
            direction VARCHAR(10),
            lots NUMERIC(10,2),
            result VARCHAR(10),
            pnl NUMERIC(15,2) DEFAULT 0,
            has_vm BOOLEAN DEFAULT FALSE,
            vm_lots NUMERIC(10,2),
            vm_result VARCHAR(10),
            vm_pnl NUMERIC(15,2) DEFAULT 0,
            screenshot_url TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create withdrawals table
    op.execute("""
        CREATE TABLE IF NOT EXISTS withdrawals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id),
            workspace_id UUID NOT NULL REFERENCES workspaces(id),
            amount NUMERIC(15,2),
            date DATE,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create daily_notes table
    op.execute("""
        CREATE TABLE IF NOT EXISTS daily_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            account_id UUID NOT NULL REFERENCES accounts(id),
            workspace_id UUID NOT NULL REFERENCES workspaces(id),
            date DATE,
            note TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS daily_notes")
    op.execute("DROP TABLE IF EXISTS withdrawals")
    op.execute("DROP TABLE IF EXISTS trades")
    op.execute("DROP TABLE IF EXISTS accounts")
    op.execute("DROP TABLE IF EXISTS workspace_members")
    op.execute("DROP TABLE IF EXISTS workspaces")
    op.execute("DROP TABLE IF EXISTS users")
