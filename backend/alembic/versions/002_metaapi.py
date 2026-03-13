from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('accounts',
        sa.Column('metaapi_account_id', sa.String(100), nullable=True)
    )

def downgrade():
    op.drop_column('accounts', 'metaapi_account_id')
