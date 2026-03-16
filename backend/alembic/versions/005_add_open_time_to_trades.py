from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
        ALTER TABLE trades
        ADD COLUMN IF NOT EXISTS open_time VARCHAR(20);
    """)

def downgrade():
    op.execute("""
        ALTER TABLE trades
        DROP COLUMN IF EXISTS open_time;
    """)
