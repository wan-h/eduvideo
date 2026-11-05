# -*- coding: utf-8 -*-
'''
@File    :   eduvideo.py
@Author  :   一力辉
'''

from datetime import datetime
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.server.depends import register_dal
from src.server.dal.base import BaseDatabaseDAL
from src.server.models.eduvideo import VideoSynthesisRecord, WorkspaceFolder, WorkspaceScriptRelation, \
    VoiceCloneRecord, VideoSynthesisTemplate, ChatSession, ChatMessage, EdtTtsRecord


@register_dal
class VideoSynthesisRecordDAL(BaseDatabaseDAL):

    async def create(
        self,
        user_id: str,
        script_task_id: str,
        synthesis_task_id: str,
        script_md5: str | None = None,
        activate: bool = True
    ) -> VideoSynthesisRecord:
        record = VideoSynthesisRecord(
            user_id=user_id,
            script_task_id=script_task_id,
            synthesis_task_id=synthesis_task_id,
            script_md5=script_md5,
            activate=activate
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def query_active_by_md5(
        self,
        user_id: str,
        script_task_id: str,
        script_md5: str
    ) -> VideoSynthesisRecord | None:
        """根据用户ID、脚本任务ID和MD5查询最旧/最新的未失效合成记录"""
        query = select(VideoSynthesisRecord).where(
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.script_task_id == script_task_id,
            VideoSynthesisRecord.script_md5 == script_md5,
            VideoSynthesisRecord.activate == True
        ).order_by(VideoSynthesisRecord.created_at.desc())
        result = await self.session.execute(query)
        return result.scalars().first()

    async def query_by_id(
        self,
        id: str,
        user_id: str
    ) -> VideoSynthesisRecord | None:
        query = select(VideoSynthesisRecord).where(
            VideoSynthesisRecord.id == id, 
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.activate == True
        )
        result = await self.session.execute(query)
        record = result.scalar()
        return record
    
    async def query_by_user_id(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[VideoSynthesisRecord]:
        query = select(VideoSynthesisRecord).where(
            VideoSynthesisRecord.user_id == user_id, 
            VideoSynthesisRecord.activate == True
        ).order_by(VideoSynthesisRecord.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def query_by_script_task_id(
        self,
        script_task_id: str,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[VideoSynthesisRecord]:
        query = select(VideoSynthesisRecord).where(
            VideoSynthesisRecord.script_task_id == script_task_id, 
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.activate == True
        ).order_by(VideoSynthesisRecord.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def query_by_synthesis_task_id(
        self,
        synthesis_task_id: str,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[VideoSynthesisRecord]:
        query = select(VideoSynthesisRecord).where(
            VideoSynthesisRecord.synthesis_task_id == synthesis_task_id,
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.activate == True
        ).order_by(VideoSynthesisRecord.created_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def count_by_user_id(
        self,
        user_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(VideoSynthesisRecord.id)).where(
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def count_by_script_task_id(
        self,
        script_task_id: str,
        user_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(VideoSynthesisRecord.id)).where(
            VideoSynthesisRecord.script_task_id == script_task_id,
            VideoSynthesisRecord.user_id == user_id,
            VideoSynthesisRecord.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0


@register_dal
class WorkspaceDAL(BaseDatabaseDAL):

    async def create_folder(
        self,
        user_id: str,
        name: str,
        parent_id: str | None = None
    ) -> WorkspaceFolder:
        folder = WorkspaceFolder(
            user_id=user_id,
            name=name,
            parent_id=parent_id
        )
        self.session.add(folder)
        await self.session.flush()
        return folder

    async def query_folder_by_id(
        self,
        folder_id: str,
        user_id: str
    ) -> WorkspaceFolder | None:
        query = select(WorkspaceFolder).where(
            WorkspaceFolder.id == folder_id,
            WorkspaceFolder.user_id == user_id,
            WorkspaceFolder.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def check_folder_name_exists(
        self,
        user_id: str,
        name: str,
        parent_id: str | None = None,
        exclude_id: str | None = None
    ) -> bool:
        """检查同级目录下是否存在同名文件夹"""
        conditions = [
            WorkspaceFolder.user_id == user_id,
            WorkspaceFolder.name == name,
            WorkspaceFolder.parent_id == parent_id,
            WorkspaceFolder.activate == True
        ]
        if exclude_id:
            conditions.append(WorkspaceFolder.id != exclude_id)
        query = select(WorkspaceFolder).where(*conditions)
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None

    async def query_subfolders(
        self,
        user_id: str,
        parent_id: str | None = None
    ) -> list[WorkspaceFolder]:
        query = select(WorkspaceFolder).where(
            WorkspaceFolder.user_id == user_id,
            WorkspaceFolder.parent_id == parent_id,
            WorkspaceFolder.activate == True
        ).order_by(WorkspaceFolder.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_folder_name(
        self,
        folder_id: str,
        user_id: str,
        new_name: str
    ) -> bool:
        folder = await self.query_folder_by_id(folder_id, user_id)
        if not folder:
            return False
        folder.name = new_name
        self.session.add(folder)
        await self.session.flush()
        return True

    async def delete_folder(
        self,
        folder_id: str,
        user_id: str,
        delete_all: bool = False
    ) -> bool:
        folder = await self.query_folder_by_id(folder_id, user_id)
        if not folder:
            return False

        if delete_all:
            # Recursive soft delete
            async def _deactivate_recursive(fid: str):
                # 1. 查询该文件夹下所有当前激活的脚本关联关系，以获取 script_task_id 列表
                stmt_script_ids = select(WorkspaceScriptRelation.script_task_id).where(
                    WorkspaceScriptRelation.folder_id == fid,
                    WorkspaceScriptRelation.user_id == user_id,
                    WorkspaceScriptRelation.activate == True
                )
                res_script_ids = await self.session.execute(stmt_script_ids)
                script_ids = res_script_ids.scalars().all()

                # 2. 如果存在关联的脚本，一并设置 QuestionExplanationVideoGenScriptTask 的 activate 状态为 False
                if script_ids:
                    from src.server.models.task import QuestionExplanationVideoGenScriptTask
                    await self.session.execute(
                        update(QuestionExplanationVideoGenScriptTask)
                        .where(
                            QuestionExplanationVideoGenScriptTask.id.in_(script_ids),
                            QuestionExplanationVideoGenScriptTask.user_id == user_id,
                            QuestionExplanationVideoGenScriptTask.activate == True
                        )
                        .values(activate=False)
                    )

                # Deactivate scripts in this folder
                await self.session.execute(
                    update(WorkspaceScriptRelation)
                    .where(
                        WorkspaceScriptRelation.folder_id == fid,
                        WorkspaceScriptRelation.user_id == user_id,
                        WorkspaceScriptRelation.activate == True
                    )
                    .values(
                        activate=False,
                    )
                )
                # Find subfolders
                sub_query = select(WorkspaceFolder).where(
                    WorkspaceFolder.parent_id == fid,
                    WorkspaceFolder.user_id == user_id,
                    WorkspaceFolder.activate == True
                )
                res = await self.session.execute(sub_query)
                sub_folders = res.scalars().all()
                for sub_f in sub_folders:
                    sub_f.activate = False
                    self.session.add(sub_f)
                    await _deactivate_recursive(sub_f.id)

            folder.activate = False
            self.session.add(folder)
            await _deactivate_recursive(folder_id)
        else:
            # Move immediate content to root (parent_id = None, folder_id = None)
            # Move scripts to root
            await self.session.execute(
                update(WorkspaceScriptRelation)
                .where(
                    WorkspaceScriptRelation.folder_id == folder_id,
                    WorkspaceScriptRelation.user_id == user_id,
                    WorkspaceScriptRelation.activate == True
                )
                .values(folder_id="")
            )
            # Move subfolders to root
            await self.session.execute(
                update(WorkspaceFolder)
                .where(
                    WorkspaceFolder.parent_id == folder_id,
                    WorkspaceFolder.user_id == user_id,
                    WorkspaceFolder.activate == True
                )
                .values(parent_id="")
            )
            # Deactivate folder itself
            folder.activate = False
            self.session.add(folder)

        await self.session.flush()
        return True

    # --- Script Relation Operations ---
    async def create_script_relation(
        self,
        user_id: str,
        script_task_id: str,
        folder_id: str | None = None
    ) -> WorkspaceScriptRelation:
        relation = WorkspaceScriptRelation(
            user_id=user_id,
            script_task_id=script_task_id,
            folder_id=folder_id
        )
        self.session.add(relation)
        await self.session.flush()
        return relation

    async def query_script_relation(
        self,
        script_task_id: str,
        user_id: str
    ) -> WorkspaceScriptRelation | None:
        query = select(WorkspaceScriptRelation).where(
            WorkspaceScriptRelation.script_task_id == script_task_id,
            WorkspaceScriptRelation.user_id == user_id,
            WorkspaceScriptRelation.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def move_script(
        self,
        script_task_id: str,
        user_id: str,
        target_folder_id: str | None
    ) -> bool:
        relation = await self.query_script_relation(script_task_id, user_id)
        if not relation:
            await self.create_script_relation(user_id, script_task_id, target_folder_id)
            return True
        relation.folder_id = target_folder_id
        self.session.add(relation)
        await self.session.flush()
        return True

    async def move_folder(
        self,
        folder_id: str,
        user_id: str,
        target_folder_id: str | None
    ) -> bool:
        # Check target folder exists and belongs to user if it's not root
        if target_folder_id:
            target = await self.query_folder_by_id(target_folder_id, user_id)
            if not target:
                return False
            # Prevent circular reference: target folder cannot be the folder itself or its subfolder
            curr = target_folder_id
            while curr:
                if curr == folder_id:
                    # Circular reference detected!
                    return False
                parent_query = select(WorkspaceFolder.parent_id).where(
                    WorkspaceFolder.id == curr,
                    WorkspaceFolder.user_id == user_id
                )
                res = await self.session.execute(parent_query)
                curr = res.scalar()

        folder = await self.query_folder_by_id(folder_id, user_id)
        if not folder:
            return False
        folder.parent_id = target_folder_id
        self.session.add(folder)
        await self.session.flush()
        return True


@register_dal
class VoiceCloneRecordDAL(BaseDatabaseDAL):
    async def create(
        self,
        user_id: str,
        name: str,
        voice_id: str,
        provider: str,
        prompt_text: str,
        audio: str
    ) -> VoiceCloneRecord:
        record = VoiceCloneRecord(
            user_id=user_id,
            name=name,
            voice_id=voice_id,
            provider=provider,
            prompt_text=prompt_text,
            audio=audio
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def query_count_by_user_id(
        self,
        user_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(VoiceCloneRecord.id)).where(
            VoiceCloneRecord.user_id == user_id,
            VoiceCloneRecord.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def query_by_user_id(
        self,
        user_id: str
    ) -> list[VoiceCloneRecord]:
        query = select(VoiceCloneRecord).where(
            VoiceCloneRecord.user_id == user_id,
            VoiceCloneRecord.activate == True
        ).order_by(VoiceCloneRecord.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())


@register_dal
class VideoSynthesisTemplateDAL(BaseDatabaseDAL):
    async def create(
        self,
        user_id: str,
        name: str,
        template: dict
    ) -> VideoSynthesisTemplate:
        record = VideoSynthesisTemplate(
            user_id=user_id,
            name=name,
            template=template
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def query_by_id(
        self,
        template_id: str,
        user_id: str = ""
    ) -> VideoSynthesisTemplate | None:
        query = select(VideoSynthesisTemplate).where(
            VideoSynthesisTemplate.id == template_id,
            VideoSynthesisTemplate.activate == True
        )
        if user_id:
            query = query.where(VideoSynthesisTemplate.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def query_by_user_id(
        self,
        user_id: str
    ) -> list[VideoSynthesisTemplate]:
        query = select(VideoSynthesisTemplate).where(
            VideoSynthesisTemplate.user_id == user_id,
            VideoSynthesisTemplate.activate == True
        ).order_by(VideoSynthesisTemplate.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def check_name_exists(
        self,
        user_id: str,
        name: str,
        exclude_id: str | None = None
    ) -> bool:
        """校验同一用户下是否存在同名模板"""
        conditions = [
            VideoSynthesisTemplate.user_id == user_id,
            VideoSynthesisTemplate.name == name,
            VideoSynthesisTemplate.activate == True
        ]
        if exclude_id:
            conditions.append(VideoSynthesisTemplate.id != exclude_id)
        query = select(VideoSynthesisTemplate).where(*conditions)
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None

    async def update(
        self,
        template_id: str,
        user_id: str,
        name: str | None = None,
        template: dict | None = None
    ) -> VideoSynthesisTemplate | None:
        record = await self.query_by_id(template_id, user_id)
        if not record:
            return None
        if name is not None:
            record.name = name
        if template is not None:
            record.template = template
        self.session.add(record)
        await self.session.flush()
        return record

    async def delete(
        self,
        template_id: str,
        user_id: str
    ) -> bool:
        record = await self.query_by_id(template_id, user_id)
        if not record:
            return False
        record.activate = False
        record.deleted_at=datetime.now()
        self.session.add(record)
        await self.session.flush()
        return True

@register_dal
class ChatSessionDAL(BaseDatabaseDAL):

    async def create(
        self,
        user_id: str,
        script_task_id: str,
        title: str = ""
    ) -> ChatSession:
        session = ChatSession(
            user_id=user_id,
            script_task_id=script_task_id,
            title=title,
        )
        self.session.add(session)
        await self.session.flush()
        return session

    async def query_by_id(
        self,
        session_id: str,
        user_id: str
    ) -> ChatSession | None:
        query = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id,
            ChatSession.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def query_by_script(
        self,
        user_id: str,
        script_task_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> list[ChatSession]:
        query = select(ChatSession).where(
            ChatSession.user_id == user_id,
            ChatSession.script_task_id == script_task_id,
            ChatSession.activate == True
        ).order_by(ChatSession.updated_at.desc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_by_script(
        self,
        user_id: str,
        script_task_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(ChatSession.id)).where(
            ChatSession.user_id == user_id,
            ChatSession.script_task_id == script_task_id,
            ChatSession.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def update_title(
        self,
        session_id: str,
        user_id: str,
        title: str
    ) -> bool:
        chat_session = await self.query_by_id(session_id, user_id)
        if not chat_session:
            return False
        chat_session.title = title
        self.session.add(chat_session)
        await self.session.flush()
        return True

    async def touch(self, session_id: str, user_id: str) -> None:
        """更新会话的 updated_at 时间戳"""
        chat_session = await self.query_by_id(session_id, user_id)
        if chat_session:
            chat_session.updated_at = datetime.now()
            self.session.add(chat_session)
            await self.session.flush()

    async def delete(
        self,
        session_id: str,
        user_id: str
    ) -> bool:
        chat_session = await self.query_by_id(session_id, user_id)
        if not chat_session:
            return False
        chat_session.activate = False
        self.session.add(chat_session)
        await self.session.flush()
        return True


@register_dal
class ChatMessageDAL(BaseDatabaseDAL):

    async def create(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            role=role,
            content=content,
        )
        self.session.add(message)
        await self.session.flush()
        return message

    async def query_by_session(
        self,
        session_id: str,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> list[ChatMessage]:
        query = select(ChatMessage).where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == user_id,
            ChatMessage.activate == True
        ).order_by(ChatMessage.created_at.asc()).limit(limit).offset(offset)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_by_session(
        self,
        session_id: str,
        user_id: str
    ) -> int:
        from sqlalchemy import func
        query = select(func.count(ChatMessage.id)).where(
            ChatMessage.session_id == session_id,
            ChatMessage.user_id == user_id,
            ChatMessage.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar() or 0

    async def query_recent_for_context(
        self,
        session_id: str,
        user_id: str,
        limit: int = 20
    ) -> list[ChatMessage]:
        """获取最近 N 条消息作为 LLM 上下文（按创建时间倒序取 limit 条，再翻转为正序）"""
        from sqlalchemy import func
        subq = (
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session_id,
                ChatMessage.user_id == user_id,
                ChatMessage.activate == True
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .subquery()
        )
        query = select(ChatMessage).join(
            subq, ChatMessage.id == subq.c.id
        ).order_by(ChatMessage.created_at.asc())
        result = await self.session.execute(query)
        return list(result.scalars().all())


@register_dal
class EdtTtsRecordDAL(BaseDatabaseDAL):

    async def create(
        self,
        user_id: str,
        script_task_id: str,
        tts_task_id: str,
        activate: bool = True
    ) -> EdtTtsRecord:
        record = EdtTtsRecord(
            user_id=user_id,
            script_task_id=script_task_id,
            tts_task_id=tts_task_id,
            activate=activate
        )
        self.session.add(record)
        await self.session.flush()
        return record

    async def query_by_tts_task_id(
        self,
        tts_task_id: str,
        user_id: str
    ) -> EdtTtsRecord | None:
        query = select(EdtTtsRecord).where(
            EdtTtsRecord.tts_task_id == tts_task_id,
            EdtTtsRecord.user_id == user_id,
            EdtTtsRecord.activate == True
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()