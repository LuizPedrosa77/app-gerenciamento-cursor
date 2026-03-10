"""Add user profiles, plans, referrals, and AI conversations

Revision ID: 006
Revises: 005
Create Date: 2025-01-10 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create plans table
    op.create_table('plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('price', postgresql.NUMERIC(precision=10, scale=2), nullable=False),
        sa.Column('max_accounts', sa.Integer(), server_default='1', nullable=False),
        sa.Column('features', sa.JSON(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_plans_id'), 'plans', ['id'], unique=False)

    # Create user_plans table
    op.create_table('user_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=False),
        sa.Column('validade', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_plans_id'), 'user_plans', ['id'], unique=False)
    op.create_index(op.f('ix_user_plans_plan_id'), 'user_plans', ['plan_id'], unique=False)
    op.create_index(op.f('ix_user_plans_user_id'), 'user_plans', ['user_id'], unique=False)

    # Create user_profiles table
    op.create_table('user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('foto_url', sa.String(length=1024), nullable=True),
        sa.Column('telefone', sa.String(length=20), nullable=True),
        sa.Column('cidade', sa.String(length=100), nullable=True),
        sa.Column('pais', sa.String(length=100), nullable=True),
        sa.Column('data_nascimento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('redes_sociais', sa.JSON(), nullable=True),
        sa.Column('preferencias', sa.JSON(), nullable=True),
        sa.Column('cpf', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)
    op.create_index(op.f('ix_user_profiles_user_id'), 'user_profiles', ['user_id'], unique=True)

    # Create referral_codes table
    op.create_table('referral_codes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('desconto_total', postgresql.NUMERIC(precision=5, scale=2), server_default='0', nullable=False),
        sa.Column('max_desconto', postgresql.NUMERIC(precision=5, scale=2), server_default='100', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('codigo'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_referral_codes_id'), 'referral_codes', ['id'], unique=False)
    op.create_index(op.f('ix_referral_codes_user_id'), 'referral_codes', ['user_id'], unique=True)
    op.create_index('ix_referral_codes_codigo', 'referral_codes', ['codigo'], unique=True)

    # Create referrals table
    op.create_table('referrals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('referrer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('referred_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('referral_code_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
        sa.Column('desconto_gerado', postgresql.NUMERIC(precision=5, scale=2), server_default='0', nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['referral_code_id'], ['referral_codes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referred_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['referrer_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_referrals_id'), 'referrals', ['id'], unique=False)
    op.create_index(op.f('ix_referrals_referral_code_id'), 'referrals', ['referral_code_id'], unique=False)
    op.create_index(op.f('ix_referrals_referred_id'), 'referrals', ['referred_id'], unique=False)
    op.create_index(op.f('ix_referrals_referrer_id'), 'referrals', ['referrer_id'], unique=False)

    # Create ai_conversations table
    op.create_table('ai_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('messages', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_conversations_id'), 'ai_conversations', ['id'], unique=False)
    op.create_index(op.f('ix_ai_conversations_user_id'), 'ai_conversations', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_conversations_workspace_id'), 'ai_conversations', ['workspace_id'], unique=False)


def downgrade() -> None:
    # Drop tables
    op.drop_table('ai_conversations')
    op.drop_table('referrals')
    op.drop_table('referral_codes')
    op.drop_table('user_profiles')
    op.drop_table('user_plans')
    op.drop_table('plans')
