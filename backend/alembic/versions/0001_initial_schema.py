"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-02 10:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TASK_TABLES = [
    'doc_parse_task',
    'readable_tts_task',
    'question_extract_task',
    'question_explanation_video_gen_script_task',
    'question_explanation_video_gen_synthesis_task',
    'question_explanation_video_gen_script_synthesis_task',
    'question_solve_task',
    'question_parse_task',
]


def upgrade() -> None:
    # 1. 创建基础 Task 列表对应的表
    for table_name in TASK_TABLES:
        op.create_table(
            table_name,
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.String(), nullable=False),
            sa.Column('workflow_id', sa.String(), nullable=False),
            sa.Column('request', sa.String(), nullable=False),
            sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('result', sa.String(), nullable=True, server_default=''),
            sa.Column('message', sa.String(), nullable=True, server_default=''),
            sa.Column('status', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.Column('deleted_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f(f'ix_{table_name}_user_id'), table_name, ['user_id'], unique=False)
        op.create_index(op.f(f'ix_{table_name}_workflow_id'), table_name, ['workflow_id'], unique=False)

    # 2. eduvideo 业务表
    op.create_table(
        'eduvideo_video_synthesis_record',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('script_task_id', sa.String(), nullable=False),
        sa.Column('synthesis_task_id', sa.String(), nullable=False),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('script_md5', sa.String(length=32), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_video_synthesis_record_user_id'), 'eduvideo_video_synthesis_record', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_video_synthesis_record_script_task_id'), 'eduvideo_video_synthesis_record', ['script_task_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_video_synthesis_record_synthesis_task_id'), 'eduvideo_video_synthesis_record', ['synthesis_task_id'], unique=True)
    op.create_index(op.f('ix_eduvideo_video_synthesis_record_script_md5'), 'eduvideo_video_synthesis_record', ['script_md5'], unique=False)

    op.create_table(
        'eduvideo_video_export_template',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('template', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_video_export_template_user_id'), 'eduvideo_video_export_template', ['user_id'], unique=False)

    op.create_table(
        'eduvideo_workspace_folder',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('parent_id', sa.String(), nullable=True, server_default=''),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_workspace_folder_user_id'), 'eduvideo_workspace_folder', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_workspace_folder_parent_id'), 'eduvideo_workspace_folder', ['parent_id'], unique=False)

    op.create_table(
        'eduvideo_workspace_script_relation',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('script_task_id', sa.String(), nullable=False),
        sa.Column('folder_id', sa.String(), nullable=True, server_default=''),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_workspace_script_relation_user_id'), 'eduvideo_workspace_script_relation', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_workspace_script_relation_script_task_id'), 'eduvideo_workspace_script_relation', ['script_task_id'], unique=True)
    op.create_index(op.f('ix_eduvideo_workspace_script_relation_folder_id'), 'eduvideo_workspace_script_relation', ['folder_id'], unique=False)

    op.create_table(
        'eduvideo_voice_clone_record',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('voice_id', sa.String(), nullable=False),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('prompt_text', sa.String(), nullable=False),
        sa.Column('audio', sa.String(), nullable=False),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_voice_clone_record_user_id'), 'eduvideo_voice_clone_record', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_voice_clone_record_voice_id'), 'eduvideo_voice_clone_record', ['voice_id'], unique=True)

    op.create_table(
        'eduvideo_chat_session',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('script_task_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_chat_session_user_id'), 'eduvideo_chat_session', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_chat_session_script_task_id'), 'eduvideo_chat_session', ['script_task_id'], unique=False)

    op.create_table(
        'eduvideo_chat_message',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_chat_message_session_id'), 'eduvideo_chat_message', ['session_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_chat_message_user_id'), 'eduvideo_chat_message', ['user_id'], unique=False)

    op.create_table(
        'eduvideo_doc_questions_extract_confirm',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('script_task_id', sa.String(), nullable=False),
        sa.Column('extract_question_task_id', sa.String(), nullable=False),
        sa.Column('status', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_doc_questions_extract_confirm_user_id'), 'eduvideo_doc_questions_extract_confirm', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_doc_questions_extract_confirm_script_task_id'), 'eduvideo_doc_questions_extract_confirm', ['script_task_id'], unique=True)
    op.create_index(op.f('ix_eduvideo_doc_questions_extract_confirm_extract_question_task_id'), 'eduvideo_doc_questions_extract_confirm', ['extract_question_task_id'], unique=True)

    op.create_table(
        'eduvideo_edt_tts_record',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('script_task_id', sa.String(), nullable=False),
        sa.Column('tts_task_id', sa.String(), nullable=False),
        sa.Column('activate', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_eduvideo_edt_tts_record_user_id'), 'eduvideo_edt_tts_record', ['user_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_edt_tts_record_script_task_id'), 'eduvideo_edt_tts_record', ['script_task_id'], unique=False)
    op.create_index(op.f('ix_eduvideo_edt_tts_record_tts_task_id'), 'eduvideo_edt_tts_record', ['tts_task_id'], unique=True)


def downgrade() -> None:
    op.drop_table('eduvideo_edt_tts_record')
    op.drop_table('eduvideo_doc_questions_extract_confirm')
    op.drop_table('eduvideo_chat_message')
    op.drop_table('eduvideo_chat_session')
    op.drop_table('eduvideo_voice_clone_record')
    op.drop_table('eduvideo_workspace_script_relation')
    op.drop_table('eduvideo_workspace_folder')
    op.drop_table('eduvideo_video_export_template')
    op.drop_table('eduvideo_video_synthesis_record')

    for table_name in reversed(TASK_TABLES):
        op.drop_table(table_name)
