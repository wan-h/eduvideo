# -*- coding: utf-8 -*-
"""
Unit tests for Eduvideo DAL layer (Workspace, ChatSession, VideoSynthesis, etc.).
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock

from src.server.dal.eduvideo import (
    ChatMessageDAL,
    ChatSessionDAL,
    EdtTtsRecordDAL,
    VideoSynthesisRecordDAL,
    VideoSynthesisTemplateDAL,
    VoiceCloneRecordDAL,
    WorkspaceDAL,
)


def test_video_synthesis_record_dal():
    async def _impl():
        mock_session = AsyncMock()
        dal = VideoSynthesisRecordDAL(mock_session)

        # create
        rec = await dal.create("user_1", "script_1", "synth_1", "md5_hash")
        assert rec.user_id == "user_1"
        assert rec.script_task_id == "script_1"

        # query_active_by_md5
        mock_res = MagicMock()
        mock_res.scalars().first.return_value = rec
        mock_session.execute.return_value = mock_res
        active_rec = await dal.query_active_by_md5("user_1", "script_1", "md5_hash")
        assert active_rec == rec

        # query_by_id
        mock_res.scalar.return_value = rec
        by_id = await dal.query_by_id("rec_1", "user_1")
        assert by_id == rec

        # query_by_user_id
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [rec]
        mock_res.scalars.return_value = mock_scalars
        by_user = await dal.query_by_user_id("user_1")
        assert by_user == [rec]

        # query_by_script_task_id
        by_script = await dal.query_by_script_task_id("script_1", "user_1")
        assert by_script == [rec]

        # query_by_synthesis_task_id
        by_synth = await dal.query_by_synthesis_task_id("synth_1", "user_1")
        assert by_synth == [rec]

    asyncio.run(_impl())


def test_workspace_dal():
    async def _impl():
        mock_session = AsyncMock()
        dal = WorkspaceDAL(mock_session)

        # create_folder
        folder = await dal.create_folder("user_1", "Folder A")
        assert folder.name == "Folder A"
        assert folder.user_id == "user_1"

        # check_folder_name_exists
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = folder
        mock_session.execute.return_value = mock_res
        exists = await dal.check_folder_name_exists("user_1", "Folder A")
        assert exists is True

        # query_folder_by_id
        f_by_id = await dal.query_folder_by_id("f_1", "user_1")
        assert f_by_id == folder

        # query_subfolders
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [folder]
        mock_res.scalars.return_value = mock_scalars
        subfolders = await dal.query_subfolders("user_1")
        assert subfolders == [folder]

        # update_folder_name
        updated = await dal.update_folder_name("f_1", "user_1", "New Name")
        assert updated is True

        # delete_folder
        deleted = await dal.delete_folder("f_1", "user_1")
        assert deleted is True

    asyncio.run(_impl())


def test_chat_session_dal():
    async def _impl():
        mock_session = AsyncMock()
        dal = ChatSessionDAL(mock_session)

        # create
        session = await dal.create("user_1", "script_1", "Session 1")
        assert session.user_id == "user_1"
        assert session.title == "Session 1"

        # query_by_id
        mock_res = MagicMock()
        mock_res.scalar_one_or_none.return_value = session
        mock_session.execute.return_value = mock_res
        by_id = await dal.query_by_id("s_1", "user_1")
        assert by_id == session

        # query_by_script
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [session]
        mock_res.scalars.return_value = mock_scalars
        by_script = await dal.query_by_script("user_1", "script_1")
        assert by_script == [session]

        # count_by_script
        mock_res.scalar.return_value = 1
        cnt = await dal.count_by_script("user_1", "script_1")
        assert cnt == 1

        # delete
        mock_res.rowcount = 1
        deleted = await dal.delete("s_1", "user_1")
        assert deleted is True

    asyncio.run(_impl())


def test_chat_message_dal():
    async def _impl():
        mock_session = AsyncMock()
        dal = ChatMessageDAL(mock_session)

        # create (session_id, user_id, role, content)
        msg = await dal.create("session_1", "user_1", "user", "Hello")
        assert msg.content == "Hello"
        assert msg.role == "user"

        # query_by_session
        mock_res = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = [msg]
        mock_res.scalars.return_value = mock_scalars
        mock_session.execute.return_value = mock_res
        messages = await dal.query_by_session("session_1", "user_1")
        assert messages == [msg]

        # count_by_session
        mock_res.scalar.return_value = 1
        cnt = await dal.count_by_session("session_1", "user_1")
        assert cnt == 1

    asyncio.run(_impl())


def test_other_dals():
    async def _impl():
        mock_session = AsyncMock()

        # EdtTtsRecordDAL
        tts_dal = EdtTtsRecordDAL(mock_session)
        tts_rec = await tts_dal.create("user_1", "script_1", "tts_task_1")
        assert tts_rec.tts_task_id == "tts_task_1"

        # VoiceCloneRecordDAL
        vc_dal = VoiceCloneRecordDAL(mock_session)
        vc_rec = await vc_dal.create("user_1", "Voice 1", "voice_id_1", "aliyun", "prompt text", "http://audio.wav")
        assert vc_rec.name == "Voice 1"

        # VideoSynthesisTemplateDAL
        tpl_dal = VideoSynthesisTemplateDAL(mock_session)
        tpl_rec = await tpl_dal.create("user_1", "Template 1", {})
        assert tpl_rec.name == "Template 1"

    asyncio.run(_impl())
