# -*- coding: utf-8 -*-
'''
@File    :   workspace.py
@Author  :   一力辉
'''

from typing import Literal
from fastapi import APIRouter, Query
from enum import StrEnum
from pydantic import BaseModel, Field
from datetime import datetime
from sqlalchemy import select, or_, and_, func
from src.schema import TASK_STATUS
from src.server.depends import HeaderInfo, DBSession
from src.server.exceptions import InvalidException, NotFoundException
from src.server.schema.request import BaseResponse
from src.server.models.eduvideo import WorkspaceScriptRelation
from src.server.models.task import QuestionExplanationVideoGenScriptTask
from src.server.dal.eduvideo import WorkspaceDAL
from src.server.models.eduvideo import WorkspaceFolder
from src.server.schema.eduvideo import VideoScriptDesc
from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenReq
from .schema import ScriptTaskInfo

router = APIRouter(prefix="/eduvideo/v0/workspace")


# ========================= 创建文件夹 ===========================
class FolderInfo(BaseModel):
    id: str = Field(..., description="文件夹ID")
    name: str = Field(..., description="文件夹名称")
    parent_id: str | None = Field(None, description="父文件夹ID")
    created_at: datetime = Field(..., description="创建时间")
class CreateFolderReq(BaseModel):
    name: str = Field(..., description="文件夹名称", min_length=1)
    parent_id: str | None = Field(None, description="父文件夹ID")
@router.post("/folder", response_model=BaseResponse, summary="Create Folder")
async def api_create_folder(
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    req: CreateFolderReq
):
    async with session.begin():
        # 校验父文件夹是否存在
        if req.parent_id:
            parent = await workspace_dal.query_folder_by_id(req.parent_id, header.user_id)
            if not parent:
                raise NotFoundException.NotFound(f"Parent folder not found: {req.parent_id}")

        # 校验同级目录下命名是否重复
        exists = await workspace_dal.check_folder_name_exists(header.user_id, req.name, req.parent_id)
        if exists:
            raise InvalidException.InvalidInput(f"Folder name '{req.name}' already exists in this directory.")

        folder = await workspace_dal.create_folder(header.user_id, req.name, req.parent_id)

    return BaseResponse(data=FolderInfo(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        created_at=folder.created_at
    ))


# ========================= 重命名文件夹 ===========================
class RenameFolderReq(BaseModel):
    name: str = Field(..., description="文件夹名称", min_length=1)
@router.put("/folder/{folder_id}", response_model=BaseResponse, summary="Rename Folder")
async def api_rename_folder(
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    folder_id: str,
    req: RenameFolderReq
):
    async with session.begin():
        folder = await workspace_dal.query_folder_by_id(folder_id, header.user_id)
        if not folder:
            raise NotFoundException.NotFound(f"Folder not found: {folder_id}")

        # 校验修改后是否重名
        exists = await workspace_dal.check_folder_name_exists(header.user_id, req.name, folder.parent_id, exclude_id=folder_id)
        if exists:
            raise InvalidException.InvalidInput(f"Folder name '{req.name}' already exists in this directory.")

        await workspace_dal.update_folder_name(folder_id, header.user_id, req.name)

    return BaseResponse()


# ========================= 删除文件夹 ===========================
@router.delete("/folder/{folder_id}", response_model=BaseResponse, summary="Delete Folder")
async def api_delete_folder(
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    folder_id: str,
    delete_all: bool = Query(False, description="是否递归删除所有子目录及关联文件；若为False，则将内容移动到根目录")
):
    async with session.begin():
        folder = await workspace_dal.query_folder_by_id(folder_id, header.user_id)
        if not folder:
            raise NotFoundException.NotFound(f"Folder not found: {folder_id}")

        await workspace_dal.delete_folder(folder_id, header.user_id, delete_all)

    return BaseResponse()


# ========================= 移动文件或文件夹 ===========================
class ITEM_TYPE(StrEnum):
    FOLDER = "folder"
    SCRIPT = "script"

class MoveItemInfo(BaseModel):
    item_type: ITEM_TYPE = Field(..., description="类型: folder 或 script")
    item_id: str = Field(..., description="被移动的ID")


class MoveItemReq(BaseModel):
    items: list[MoveItemInfo] = Field(..., description="被移动的项列表")
    target_folder_id: str | None = Field(None, description="目标文件夹ID，为空表示移动到根目录")


@router.put("/move", response_model=BaseResponse, summary="Move Folder or Script")
async def api_move_item(
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    req: MoveItemReq
):
    async with session.begin():
        # 1. 校验目标文件夹（非根目录）是否存在，并获取其所有祖先以进行循环引用检测
        ancestor_ids = set()
        if req.target_folder_id:
            target = await workspace_dal.query_folder_by_id(req.target_folder_id, header.user_id)
            if not target:
                raise NotFoundException.NotFound(f"Target folder not found: {req.target_folder_id}")

            # 获取目标文件夹的所有祖先ID
            curr = req.target_folder_id
            while curr:
                ancestor_ids.add(curr)
                parent_query = select(WorkspaceFolder.parent_id).where(
                    WorkspaceFolder.id == curr,
                    WorkspaceFolder.user_id == header.user_id,
                    WorkspaceFolder.activate == True
                )
                res = await session.execute(parent_query)
                curr = res.scalar()

        # 2. 按类型提取去重后的被移动 ID，并保留顺序
        seen_folders = set()
        folder_ids = []
        for item in req.items:
            if item.item_type == ITEM_TYPE.FOLDER and item.item_id not in seen_folders:
                seen_folders.add(item.item_id)
                folder_ids.append(item.item_id)

        seen_scripts = set()
        script_ids = []
        for item in req.items:
            if item.item_type == ITEM_TYPE.SCRIPT and item.item_id not in seen_scripts:
                seen_scripts.add(item.item_id)
                script_ids.append(item.item_id)

        # 3. 批量处理文件夹移动
        if folder_ids:
            # 批量查询待移动的文件夹，确保它们存在且属于当前用户
            folders_query = select(WorkspaceFolder).where(
                WorkspaceFolder.id.in_(folder_ids),
                WorkspaceFolder.user_id == header.user_id,
                WorkspaceFolder.activate == True
            )
            folders_res = await session.execute(folders_query)
            folders_to_move = list(folders_res.scalars().all())
            if len(folders_to_move) != len(folder_ids):
                found_ids = {f.id for f in folders_to_move}
                missing_ids = set(folder_ids) - found_ids
                raise NotFoundException.NotFound(f"Folders not found or access denied: {missing_ids}")

            # 批量查询目标文件夹下已存在的文件夹名称（排除自身正在移动的文件夹）
            existing_names_query = select(WorkspaceFolder.name).where(
                WorkspaceFolder.user_id == header.user_id,
                WorkspaceFolder.parent_id == req.target_folder_id,
                WorkspaceFolder.activate == True,
                WorkspaceFolder.id.not_in(folder_ids)
            )
            existing_names_res = await session.execute(existing_names_query)
            existing_names = set(existing_names_res.scalars().all())

            # 校验命名冲突与循环引用，并更新 parent_id
            moving_names = set()
            for folder in folders_to_move:
                # 校验同级目标目录下是否重名
                if folder.name in existing_names:
                    raise InvalidException.InvalidInput(f"Folder name '{folder.name}' already exists in target directory.")
                if folder.name in moving_names:
                    raise InvalidException.InvalidInput(f"Duplicate folder name '{folder.name}' in move request.")
                moving_names.add(folder.name)

                # 循环引用校验（目标文件夹不能是待移动文件夹本身或其子文件夹）
                if folder.id in ancestor_ids:
                    raise InvalidException.InvalidOperation(f"Invalid move operation for folder '{folder.name}' (circular dependency).")

                # 执行移动
                folder.parent_id = req.target_folder_id
                session.add(folder)

        # 4. 批量处理脚本移动
        if script_ids:
            # 批量查询已存在的脚本关系
            relations_query = select(WorkspaceScriptRelation).where(
                WorkspaceScriptRelation.script_task_id.in_(script_ids),
                WorkspaceScriptRelation.user_id == header.user_id,
                WorkspaceScriptRelation.activate == True
            )
            relations_res = await session.execute(relations_query)
            existing_relations = {r.script_task_id: r for r in relations_res.scalars().all()}

            # 更新或新建脚本关系
            for s_id in script_ids:
                if s_id in existing_relations:
                    relation = existing_relations[s_id]
                    relation.folder_id = req.target_folder_id
                    session.add(relation)
                else:
                    new_relation = WorkspaceScriptRelation(
                        user_id=header.user_id,
                        script_task_id=s_id,
                        folder_id=req.target_folder_id
                    )
                    session.add(new_relation)

    return BaseResponse()


# ========================= 获取工作空间目录内容 ===========================
class WorkspaceItem(BaseModel):
    item_type: ITEM_TYPE = Field(..., description="类型: folder 或 script")
class WorkspaceScriptTaskInfo(ScriptTaskInfo, WorkspaceItem):
    ...
class WorkspaceFolderInfo(FolderInfo, WorkspaceItem):
    items_count: int = Field(0, description="子项数量")
class WorkspaceListResp(BaseResponse):
    class WorkspaceListDesc(BaseModel):
        items: list[WorkspaceFolderInfo|WorkspaceScriptTaskInfo]
        total: int
        folder_name: str
    data: WorkspaceListDesc = Field(..., description="工作空间数据")
@router.get("", response_model=WorkspaceListResp, summary="Get Workspace Contents")
async def api_get_workspace(
    header: HeaderInfo,
    session: DBSession,
    workspace_dal: WorkspaceDAL,
    folder_id: str = Query("", description="文件夹ID，为空表示获取根目录内容"),
    item_type: Literal["folder", "script", "all"] = Query("all", description="类型过滤: folder (文件夹), script (脚本), all (全部)"),
    fuzzy_search: str = Query("", description="模糊搜索关键字"),
    status: TASK_STATUS | None = Query(None, description="处理状态过滤，默认 None 表示所有状态"),
    limit: int = Query(20, description="分页限制"),
    offset: int = Query(0, description="分页偏移")
):
    async with session.begin():
        # 校验当前文件夹是否存在并获取名称
        folder_name = ""
        if folder_id:
            curr_folder = await workspace_dal.query_folder_by_id(folder_id, header.user_id)
            if not curr_folder:
                raise NotFoundException.NotFound(f"Current folder not found: {folder_id}")
            folder_name = curr_folder.name

        # 1. 查询子文件夹总数
        folders_count = 0
        folder_conditions = []
        if item_type in ("folder", "all"):
            folder_conditions = [
                WorkspaceFolder.user_id == header.user_id,
                WorkspaceFolder.parent_id == folder_id,
                WorkspaceFolder.activate == True
            ]
            if fuzzy_search:
                folder_conditions.append(WorkspaceFolder.name.like(f"%{fuzzy_search}%"))

            folder_count_query = select(func.count(WorkspaceFolder.id)).where(*folder_conditions)
            folder_count_res = await session.execute(folder_count_query)
            folders_count = folder_count_res.scalar() or 0

        # 2. 查询对应的脚本总数
        scripts_count = 0
        script_conditions = []
        if item_type in ("script", "all"):
            script_conditions = [
                QuestionExplanationVideoGenScriptTask.user_id == header.user_id,
                QuestionExplanationVideoGenScriptTask.activate == True
            ]
            if fuzzy_search:
                script_conditions.append(
                    or_(
                        QuestionExplanationVideoGenScriptTask.result.like(f"%{fuzzy_search}%"),
                        QuestionExplanationVideoGenScriptTask.request.like(f"%{fuzzy_search}%")
                    )
                )
            if status is not None:
                script_conditions.append(QuestionExplanationVideoGenScriptTask.status == status)

            if folder_id:
                count_query = (
                    select(func.count(QuestionExplanationVideoGenScriptTask.id))
                    .join(
                        WorkspaceScriptRelation,
                        WorkspaceScriptRelation.script_task_id == QuestionExplanationVideoGenScriptTask.id
                    )
                    .where(
                        WorkspaceScriptRelation.user_id == header.user_id,
                        WorkspaceScriptRelation.folder_id == folder_id,
                        WorkspaceScriptRelation.activate == True,
                        *script_conditions
                    )
                )
            else:
                count_query = (
                    select(func.count(QuestionExplanationVideoGenScriptTask.id))
                    .outerjoin(
                        WorkspaceScriptRelation,
                        WorkspaceScriptRelation.script_task_id == QuestionExplanationVideoGenScriptTask.id
                    )
                    .where(
                        or_(
                            and_(WorkspaceScriptRelation.folder_id == "", WorkspaceScriptRelation.activate == True),
                            WorkspaceScriptRelation.id == None
                        ),
                        *script_conditions
                    )
                )
            scripts_count_res = await session.execute(count_query)
            scripts_count = scripts_count_res.scalar() or 0

        total = folders_count + scripts_count

        # 3. 混合与独立分页逻辑
        paged_folders = []
        script_limit = 0
        script_offset = 0

        if item_type == "folder":
            folder_query = (
                select(WorkspaceFolder)
                .where(*folder_conditions)
                .order_by(WorkspaceFolder.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            folder_res = await session.execute(folder_query)
            paged_folders = list(folder_res.scalars().all())
            script_limit = 0
            script_offset = 0
        elif item_type == "script":
            paged_folders = []
            script_limit = limit
            script_offset = offset
        else:  # "all"
            if offset < folders_count:
                folder_query = (
                    select(WorkspaceFolder)
                    .where(*folder_conditions)
                    .order_by(WorkspaceFolder.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                )
                folder_res = await session.execute(folder_query)
                paged_folders = list(folder_res.scalars().all())
                
                paged_folders_count = len(paged_folders)
                script_limit = limit - paged_folders_count
                script_offset = 0
            else:
                paged_folders = []
                script_limit = limit
                script_offset = offset - folders_count

        # 4. 根据限制条件查询脚本数据
        scripts = []
        if script_limit > 0:
            if folder_id:
                query = (
                    select(QuestionExplanationVideoGenScriptTask)
                    .join(
                        WorkspaceScriptRelation,
                        WorkspaceScriptRelation.script_task_id == QuestionExplanationVideoGenScriptTask.id
                    )
                    .where(
                        WorkspaceScriptRelation.user_id == header.user_id,
                        WorkspaceScriptRelation.folder_id == folder_id,
                        WorkspaceScriptRelation.activate == True,
                        *script_conditions
                    )
                    .order_by(WorkspaceScriptRelation.created_at.desc())
                    .limit(script_limit)
                    .offset(script_offset)
                )
            else:
                query = (
                    select(QuestionExplanationVideoGenScriptTask)
                    .outerjoin(
                        WorkspaceScriptRelation,
                        WorkspaceScriptRelation.script_task_id == QuestionExplanationVideoGenScriptTask.id
                    )
                    .where(
                        or_(
                            and_(WorkspaceScriptRelation.folder_id == "", WorkspaceScriptRelation.activate == True),
                            WorkspaceScriptRelation.id == None
                        ),
                        *script_conditions
                    )
                    .order_by(QuestionExplanationVideoGenScriptTask.created_at.desc())
                    .limit(script_limit)
                    .offset(script_offset)
                )
            result = await session.execute(query)
            scripts = result.scalars().all()

        # 5. 格式化数据返回
        folder_ids = [f.id for f in paged_folders]
        items_counts = {}
        if folder_ids:
            counts_query = (
                select(WorkspaceScriptRelation.folder_id, func.count(QuestionExplanationVideoGenScriptTask.id))
                .join(
                    QuestionExplanationVideoGenScriptTask,
                    QuestionExplanationVideoGenScriptTask.id == WorkspaceScriptRelation.script_task_id
                )
                .where(
                    WorkspaceScriptRelation.user_id == header.user_id,
                    WorkspaceScriptRelation.folder_id.in_(folder_ids),
                    WorkspaceScriptRelation.activate == True,
                    QuestionExplanationVideoGenScriptTask.activate == True
                )
                .group_by(WorkspaceScriptRelation.folder_id)
            )
            counts_res = await session.execute(counts_query)
            items_counts = {row[0]: row[1] for row in counts_res.all()}

        folder_infos = [
            WorkspaceFolderInfo(
                id=f.id,
                name=f.name,
                parent_id=f.parent_id,
                created_at=f.created_at,
                item_type=ITEM_TYPE.FOLDER,
                items_count=items_counts.get(f.id, 0)
            )
            for f in paged_folders
        ]

        script_infos = []
        for s in scripts:
            title = ""
            if s.result:
                try:
                    desc = VideoScriptDesc.model_validate_json(s.result)
                    if desc.question_metadata:
                        title = desc.question_metadata.title
                except Exception:
                    pass

            script_infos.append(
                WorkspaceScriptTaskInfo(
                    id=s.id,
                    status=s.status,
                    progress=s.progress,
                    message=s.message or "",
                    created_at=s.created_at,
                    text=ScriptGenReq.model_validate_json(s.request).text,
                    title=title,
                    item_type=ITEM_TYPE.SCRIPT
                )
            )

        return WorkspaceListResp(data=WorkspaceListResp.WorkspaceListDesc(
            items=folder_infos + script_infos,
            total=total,
            folder_name=folder_name
        ))
