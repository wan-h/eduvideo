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
    from src.server.schema.eduvideo import SubtitleDesc, VideoScriptDesc
    from src.server.api.eduvideo.utils import get_voice_id
    from src.tasks.base.workflows import BaseWorkflow
    from src.tasks.readable_tts.schema import ReadableTTSWorkflowParams, ReadableTTSWorkflowResult
    from src.tasks.readable_tts.workflows import ReadableTTSWorkflow
    from src.tasks.question_extract.schema import QuestionExtractWorkflowParams, QuestionExtractWorkflowResult
    from src.tasks.question_extract.workflows import QuestionExtractWorkflow
    from src.tasks.question_explanation_video_gen.script_gen.schema import ScriptGenWorkflowParams, ScriptGenWorkflowResult, \
        QuestionParseResult, QuestionSolveResult, GenerateScriptParams, CreateQuestionExtractTaskParams, GenVideoScriptImageUploadReplaceParams
    from src.tasks.question_explanation_video_gen.script_gen.activities import generate_script, create_questions_extract_task, gen_video_script_image_upload_replace
    from src.tasks.question_solve.schema import QuestionSolveWorkflowParams, QuestionSolveWorkflowResult
    from src.tasks.question_solve.workflows import QuestionSolveWorkflow
    from src.tasks.question_parse.schema import QuestionParseWorkflowParams
    from src.tasks.question_parse.workflows import QuestionParseWorkflow

@workflow.defn
class ScriptGenWorkflow(BaseWorkflow):
    @workflow.run
    async def run(self, params: ScriptGenWorkflowParams) -> ScriptGenWorkflowResult | None:
        await self._update_task_status(
            request_info=params.resquest_info,
            task_id=params.task_id,
            task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
            status=TASK_STATUS.STARTED,
            message="正在排队等待脚本生成节点...",
            progress=0,
            is_internal=params.is_internal       
        )

        try:
            # 解析缓存脚本，或者创建空脚本结构
            if params.script:
                try:
                    video_script = VideoScriptDesc.model_validate_json(params.script)
                except Exception:
                    video_script = VideoScriptDesc(steps=VideoScriptDesc.StepsDesc())
            else:
                video_script = VideoScriptDesc(steps=VideoScriptDesc.StepsDesc())

            if not video_script.steps:
                video_script.steps = VideoScriptDesc.StepsDesc()

            # 0. 题目提取
            if params.question_extract and params.urls:
                if not video_script.steps.question_extract:
                    question_extract_result = await self._run_question_extract(params)
                    video_script.steps.question_extract = question_extract_result
                else:
                    question_extract_result = video_script.steps.question_extract

                if question_extract_result.total == 0:
                    raise Exception("No question extracted")
                elif question_extract_result.total == 1:
                    # 题目图片与文本获取
                    params.urls = [question_extract_result.questions[0].image]
                    params.text += "\n\n" + question_extract_result.questions[0].content
                    # 更新状态并写入缓存结果
                    await self._update_task_status(
                        request_info=params.resquest_info,
                        task_id=params.task_id,
                        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                        status=TASK_STATUS.STARTED,
                        message="Question extracted",
                        progress=10,
                        result=video_script.model_dump_json(),
                        is_internal=params.is_internal       
                    )
                else:
                    # 此时result写入当前包含 steps.question_extract 的 video_script
                    await self._update_task_status(
                        request_info=params.resquest_info,
                        task_id=params.task_id,
                        task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                        status=TASK_STATUS.STARTED,
                        message="Multiple questions extracted, waiting for user confirmation",
                        progress=10,
                        result=video_script.model_dump_json(),
                        is_internal=params.is_internal       
                    )
                    # 多个题目，创建待确认任务并中断当前工作流
                    await workflow.execute_activity(
                        create_questions_extract_task,
                        CreateQuestionExtractTaskParams(
                            resquest_info=params.resquest_info,
                            script_task_id=params.task_id,
                            urls=params.urls,
                            extract_result=question_extract_result.model_dump()
                        ),
                        start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_explanation_video_gen_script.start_to_close_timeout),
                        retry_policy=RetryPolicy(
                            initial_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.initial_interval),
                            maximum_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.maximum_interval),
                            maximum_attempts=config.tasks.question_explanation_video_gen_script.retry_config.maximum_attempts,
                        )
                    )
                    return None
            else:
                # 若不需要提取，使用 video_script 中的缓存（如果有的话）
                if video_script.steps.question_extract and video_script.steps.question_extract.total == 1:
                    params.urls = [video_script.steps.question_extract.questions[0].image]
                    params.text += video_script.steps.question_extract.questions[0].content
            
            # 1. 提取问题结构化信息 (Question Parse)
            if not video_script.steps.question_parse:
                question_parse_result = await self._run_question_parse(params)
                video_script.steps.question_parse = question_parse_result
                await self._update_task_status(
                    request_info=params.resquest_info,
                    task_id=params.task_id,
                    task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                    status=TASK_STATUS.STARTED,
                    message="Parsed question completed",
                    progress=30,
                    result=video_script.model_dump_json(),
                    is_internal=params.is_internal
                )
            else:
                question_parse_result = video_script.steps.question_parse

            # 2. 问题解答 (Question Solve)
            if not video_script.steps.question_solve:
                question_solve_result = await self._run_question_solve(params, question_parse_result)
                video_script.steps.question_solve = question_solve_result
                await self._update_task_status(
                    request_info=params.resquest_info,
                    task_id=params.task_id,
                    task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                    status=TASK_STATUS.STARTED,
                    message="Solved question completed",
                    progress=50,
                    result=video_script.model_dump_json(),
                    is_internal=params.is_internal
                )
            else:
                question_solve_result = video_script.steps.question_solve

            # 3. 生成脚本 (Generate Script)
            if not video_script.scenes:
                video_script_result = await self._run_generate_script(params, question_parse_result, question_solve_result)
                video_script.scenes = video_script_result.scenes
                video_script.question_content = video_script_result.question_content
                video_script.question_metadata = video_script_result.question_metadata
                await self._update_task_status(
                    request_info=params.resquest_info,
                    task_id=params.task_id,
                    task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                    status=TASK_STATUS.STARTED,
                    message="Script generated",
                    progress=70,
                    result=video_script.model_dump_json(),
                    is_internal=params.is_internal
                )
            
            # 4. 脚本图片生成替换
            video_script = await workflow.execute_activity(
                gen_video_script_image_upload_replace,
                GenVideoScriptImageUploadReplaceParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id, 
                    video_script=video_script,
                    language=params.language
                ),
                start_to_close_timeout=workflow.timedelta(minutes=3),
                retry_policy=RetryPolicy(
                    initial_interval=workflow.timedelta(seconds=1),
                    maximum_interval=workflow.timedelta(seconds=10),
                    maximum_attempts=config.tasks.max_retries,
                )
            )

            # 5. 音频生成 (TTS)：已有音频的字幕跳过，失败 of 重跑
            video_script_result, error_message = await self._run_generate_audio(params, ScriptGenWorkflowResult(**video_script.model_dump()))
            video_script.scenes = video_script_result.scenes
    
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                status=TASK_STATUS.SUCCESS,
                message="TTS generated",
                progress=90,
                result=video_script.model_dump_json(),
                is_internal=params.is_internal
            )
            # 捕获tts中的失败
            if error_message:
                raise Exception(error_message)
            # 6. 脚本生成完成
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                status=TASK_STATUS.SUCCESS,
                message="Task completed",
                progress=100,
                is_internal=params.is_internal
            )

            return ScriptGenWorkflowResult(**video_script.model_dump())
        except (Exception, asyncio.CancelledError) as e:
            is_cancelled = isinstance(e, asyncio.CancelledError)
            target_status = TASK_STATUS.REVOKED if is_cancelled else TASK_STATUS.FAILURE
            err_msg = "Task was canceled" if is_cancelled else f"Task failed: {self._get_exception_message(e)}"
            await self._update_task_status(
                request_info=params.resquest_info,
                task_id=params.task_id,
                task_type=TASK_TYPE.QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT,
                status=target_status,
                progress=0,
                message=err_msg,
                is_internal=params.is_internal
            )
            raise e
    
    async def _run_question_extract(self, params: ScriptGenWorkflowParams) -> QuestionExtractWorkflowResult:
        question_extract_result = await workflow.execute_child_workflow(
            QuestionExtractWorkflow,
            QuestionExtractWorkflowParams(
                resquest_info=params.resquest_info,
                task_id=params.task_id,
                urls=params.urls,
                is_internal=True
            ),
            id=f"{workflow.info().workflow_id}_{TASK_TYPE.QUESTION_EXTRACT}_{workflow.uuid4()}",
            task_queue=config.tasks.question_extract.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_extract.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_extract.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_extract.retry_config.maximum_attempts,
            )
        )
 
        workflow.logger.debug(f"[VideoScriptGenWorkflow] question_extract_result: {question_extract_result}")
        return question_extract_result

    async def _run_question_parse(
        self, 
        params: ScriptGenWorkflowParams
    ) -> QuestionParseResult:
        question_parse_result = await workflow.execute_child_workflow(
            QuestionParseWorkflow,
            QuestionParseWorkflowParams(
                resquest_info=params.resquest_info,
                task_id=params.task_id,
                question_text=params.text,
                stage=params.stage,
                language=params.language,
                is_internal=True
            ),
            id=f"{workflow.info().workflow_id}_{TASK_TYPE.QUESTION_PARSE}_{workflow.uuid4()}",
            task_queue=config.tasks.question_parse.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_parse.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_parse.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_parse.retry_config.maximum_attempts,
            )
        )
        workflow.logger.debug(f"[VideoScriptGenWorkflow] question_parse_result: {question_parse_result}")
        return question_parse_result

    async def _run_question_solve(
        self, 
        params: ScriptGenWorkflowParams, 
        question_parse_result: QuestionParseResult
    ) -> QuestionSolveWorkflowResult:
        question_solve_result = await workflow.execute_child_workflow(
            QuestionSolveWorkflow,
            QuestionSolveWorkflowParams(
                resquest_info=params.resquest_info,
                task_id=params.task_id,
                question_text=params.text,
                question_images=params.urls,
                subject=question_parse_result.subject,
                stage=params.stage,
                language=params.language,
                is_internal=True
            ),
            id=f"{workflow.info().workflow_id}_{TASK_TYPE.QUESTION_SOLVE}_{workflow.uuid4()}",
            task_queue=config.tasks.question_solve.task_queue,
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_solve.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_solve.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_solve.retry_config.maximum_attempts,
            )
        )
        workflow.logger.debug(f"[VideoScriptGenWorkflow] question_solve: {question_solve_result}")
        return question_solve_result

    async def _run_generate_script(
        self, 
        params: ScriptGenWorkflowParams, 
        question_parse_result: QuestionParseResult, 
        question_solve_result: QuestionSolveResult
    ) -> ScriptGenWorkflowResult:
        video_script = await workflow.execute_activity(
            generate_script,
            GenerateScriptParams(
                question_text=params.text,
                question_images=params.urls,
                question_parse_result=question_parse_result,
                question_solve_result=question_solve_result,
                stage=params.stage,
                language=params.language,
                voice=params.voice,
            ),
            start_to_close_timeout=workflow.timedelta(minutes=config.tasks.question_explanation_video_gen_script.start_to_close_timeout),
            retry_policy=RetryPolicy(
                initial_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.initial_interval),
                maximum_interval=workflow.timedelta(seconds=config.tasks.question_explanation_video_gen_script.retry_config.maximum_interval),
                maximum_attempts=config.tasks.question_explanation_video_gen_script.retry_config.maximum_attempts,
            )
        )
        workflow.logger.debug(f"[VideoScriptGenWorkflow] generate_script: {video_script}")
        return video_script

    async def _run_generate_audio(
        self, 
        params: ScriptGenWorkflowParams, 
        video_script: ScriptGenWorkflowResult
    ) -> tuple[ScriptGenWorkflowResult, str]:
        error_message = ''
        subtitles_with_position = self._extract_subtitles(video_script)
        # 仅对还没有音频的字幕发起 TTS；已有 audio 的（缓存命中）直接跳过
        pending = [
            (position_key, subtitle)
            for position_key, subtitle in subtitles_with_position
            if not subtitle.audio
        ]
        workflow.logger.debug(f"[ScriptGenWorkflow] pending subtitles: {pending}")
        if not pending:
            return (video_script, error_message)

        # 执行 TTS 任务
        subject = video_script.question_metadata.subject
        tts_tasks = []
        for position_key, subtitle in pending:
            task = workflow.execute_child_workflow(
                ReadableTTSWorkflow.run,
                ReadableTTSWorkflowParams(
                    resquest_info=params.resquest_info,
                    task_id=params.task_id,
                    text=subtitle.text,
                    voice=get_voice_id(params.voice),
                    subject=subject,
                    language=params.language,
                    is_internal=True,
                ),
                id=f"{workflow.info().workflow_id}_{TASK_TYPE.READABLE_TTS}_{workflow.uuid4()}",
                retry_policy=RetryPolicy(
                    initial_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.initial_interval),
                    maximum_interval=workflow.timedelta(seconds=config.tasks.readable_tts.retry_config.maximum_interval),
                    maximum_attempts=config.tasks.readable_tts.retry_config.maximum_attempts,
                ),
                task_queue=config.tasks.readable_tts.task_queue
            )
            tts_tasks.append((position_key, task))

        # return_exceptions=True 让部分失败不中断整个 gather
        raw_results: list = await asyncio.gather(
            *[task for _, task in tts_tasks],
            return_exceptions=True
        )

        audio_id_mapping: dict[str, ReadableTTSWorkflowResult] = {}
        failed_count = 0
        for (position_key, _), result in zip(tts_tasks, raw_results):
            if isinstance(result, Exception):
                workflow.logger.warning(
                    f"[ScriptGenWorkflow] TTS failed for position {position_key}: {result}"
                )
                failed_count += 1
            else:
                audio_id_mapping[position_key] = result
        if failed_count > 0:
            error_message = f"Failed to generate {failed_count} audio(s)"

        # 将成功的音频填充进脚本，并更新中间状态
        if audio_id_mapping:
            video_script = self._fill_audio_ids(video_script, audio_id_mapping)
            workflow.logger.debug(
                f"[ScriptGenWorkflow] tts partial done: {len(audio_id_mapping)} ok, "
                f"{failed_count} failed"
            )
        return (video_script, error_message)
    
    def _extract_subtitles(self, video_script: ScriptGenWorkflowResult) -> list[tuple[str, SubtitleDesc]]:
        subtitles_with_position = []
        # Extract from question_introduction
        for segment_index, subtitle in enumerate(video_script.scenes.question_introduction.subtitles):
            position_key = f"scene_0_segment_{segment_index}"
            subtitles_with_position.append((position_key, subtitle))
        # Extract from others
        for scene_index, scene in enumerate(
            [video_script.scenes.question_solution, video_script.scenes.question_key_points], start=1
        ):
            segment_index = 0
            for segment in scene.segments:
                for subtitle in segment.subtitles:
                    position_key = f"scene_{scene_index}_segment_{segment_index}"
                    subtitles_with_position.append((position_key, subtitle))
                    segment_index += 1
        return subtitles_with_position

    def _fill_audio_ids(self, video_script: ScriptGenWorkflowResult, audio_id_mapping: dict[str, ReadableTTSWorkflowResult]) -> ScriptGenWorkflowResult:
        # scene 0
        for segment_index, subtitle in enumerate(video_script.scenes.question_introduction.subtitles):
            pk = f"scene_0_segment_{segment_index}"
            if pk in audio_id_mapping:
                subtitle.audio = audio_id_mapping[pk].url
                subtitle.duration = audio_id_mapping[pk].duration
                # 替换为tts模型的真实输入，方便用户编辑
                subtitle.text = audio_id_mapping[pk].text
        # scenes 1, 2
        for scene_index, scene in enumerate(
            [video_script.scenes.question_solution, video_script.scenes.question_key_points], start=1
        ):
            segment_index = 0
            for segment in scene.segments:
                for subtitle in segment.subtitles:
                    pk = f"scene_{scene_index}_segment_{segment_index}"
                    if pk in audio_id_mapping:
                        subtitle.audio = audio_id_mapping[pk].url
                        subtitle.duration = audio_id_mapping[pk].duration
                        subtitle.text = audio_id_mapping[pk].text
                    segment_index += 1
        return video_script