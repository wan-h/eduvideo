# -*- coding: utf-8 -*-
"""
@File    : workflows.py
@Author  : 一力辉
"""


from temporalio import workflow
from temporalio.common import RetryPolicy


with workflow.unsafe.imports_passed_through():
    import pydantic_core
    import asyncio
    from src.utils import config, logger
    from src.schema import TASK_TYPE, TASK_STATUS, RequestInfo
    from src.server.schema.eduvideo import VideoScriptDesc, VideoExportDesc
    from src.tasks.base.workflows import BaseWorkflow
    from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenWorkflowParams
    from src.tasks.question_explanation_video_gen.script_gen.workflows import ScriptGenWorkflow
    from src.tasks.question_explanation_video_gen.video_synthesis.activities import video_synthesis
    from src.tasks.question_explanation_video_gen.video_synthesis.schema import VideoSynthesisWorkflowParams, VideoSynthesisParams, \
        VideoSynthesisWorkflowResult, ScriptVideoSynthesisWorkflowParams, ScriptVideoSynthesisWorkflowResult, \
        VideoSynthesisResult


@workflow.defn
class VideoSynthesisWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: VideoSynthesisWorkflowParams) -> VideoSynthesisWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
            status=TASK_STATUS.PENDING,
            message="正在排队等待合成节点分配...",
            progress=0,
            is_internal=params.is_internal
        )
        try:
            result = await self._run_video_synthesis(
                video_script_desc=params.video_script_desc,
                video_export_desc=params.video_export_desc,
                request_info=params.resquest_info,
                task_id=params.task_id
            )
            workflow.logger.info(f"[VideoSynthesisWorkflow] video synthesis completed: {result.video_url}")
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                status=TASK_STATUS.SUCCESS,
                message="Task completed",
                progress=100,
                result=result.video_url,
                is_internal=params.is_internal
            )
            return VideoSynthesisWorkflowResult(**result.model_dump())
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e

    async def _run_video_synthesis(
        self,
        video_script_desc: VideoScriptDesc,
        video_export_desc: VideoExportDesc,
        request_info: RequestInfo,
        task_id: str
    ) -> VideoSynthesisResult:
        return await workflow.execute_activity(
            video_synthesis,
            VideoSynthesisParams(
                resquest_info=request_info,
                task_id=task_id,
                video_script_desc=video_script_desc,
                video_export_desc=video_export_desc,
            ),
            start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_explanation_video_gen_synthesis.start_to_close_timeout),
            heartbeat_timeout=workflow.timedelta(seconds=60),
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_synthesis.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_synthesis.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_explanation_video_gen_synthesis.retry_config.maximum_attempts,
            )
        )

@workflow.defn
class VideoScriptSynthesisWorkflow(BaseWorkflow):
    """e2e视频生成工作流，包含脚本生成和视频合成两个阶段，适用于API场景"""
    @workflow.run
    async def run(self, params: ScriptVideoSynthesisWorkflowParams) -> ScriptVideoSynthesisWorkflowResult:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
            status=TASK_STATUS.PENDING,
            message="正在排队等待处理...",
            progress=0,
            is_internal=params.is_internal
        )
        try:
            # 1. 生成脚本
            video_script = await self._run_script_generation(params)
            workflow.logger.debug(f"[VideoScriptSynthesisWorkflow] script generation completed: {video_script}")
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
                status=TASK_STATUS.STARTED,
                message="Script generation completed",
                progress=50,
                is_internal=params.is_internal
            )
            
            # 2. 视频合成
            result = await self._run_video_synthesis(
                video_script_desc=video_script,
                video_export_desc=params.video_export_desc,
                request_info=params.resquest_info,
                task_id=params.synthesis_task_id
            )
            video_url = result.video_url
            workflow.logger.info(f"[VideoSynthesisWorkflow] video synthesis completed: {video_url}")

            resp = ScriptVideoSynthesisWorkflowResult(
                video_url=video_url, 
                # video_script=video_script
            )
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
                status=TASK_STATUS.SUCCESS,
                message="Task completed",
                progress=100,
                result=resp.model_dump_json(),
                is_internal=params.is_internal
            )
            return resp
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e

    async def _run_script_generation(self, params: ScriptVideoSynthesisWorkflowParams) -> VideoScriptDesc:
        return await workflow.execute_child_workflow(
            ScriptGenWorkflow.run,
            ScriptGenWorkflowParams(
                resquest_info=params.resquest_info,
                task_id=params.script_task_id,
                text=params.text,
                urls=params.urls,
                voice=params.voice,
                stage=params.stage,
                language=params.language
            ),
            id=f"{workflow.info().workflow_id}_{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT}_{workflow.uuid4()}",
            task_queue=config.tasks.question_explanation_video_gen_script.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_explanation_video_gen_script.retry_config.maximum_attempts,
            )
        )

    async def _run_video_synthesis(
        self,
        video_script_desc: VideoScriptDesc,
        video_export_desc: VideoExportDesc,
        request_info: RequestInfo,
        task_id: str
    ) -> VideoSynthesisResult:
        return await workflow.execute_child_workflow(
            VideoSynthesisWorkflow.run,
            VideoSynthesisWorkflowParams(
                resquest_info=request_info,
                task_id=task_id,
                video_script_desc=video_script_desc,
                video_export_desc=video_export_desc,
            ),
            id=f"{workflow.info().workflow_id}_{TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS}_{workflow.uuid4()}",
            task_queue=config.tasks.question_explanation_video_gen_synthesis.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_synthesis.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_synthesis.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_explanation_video_gen_synthesis.retry_config.maximum_attempts,
            )
        )