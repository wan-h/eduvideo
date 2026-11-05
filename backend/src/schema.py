from enum import StrEnum, IntEnum
from uuid import uuid4
from pydantic import BaseModel, Field
from typing import Literal

# ========================= 枚举类型 =======================
class DescriptionEnum(StrEnum):
    description: str
    def __new__(cls, value: str, description: str):
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.description = description # type: ignore
        return obj
    
    @classmethod
    def dict(cls):
        return {k: v.value for k, v in cls.__members__.items()}
    
    @classmethod
    def format_desc(cls):
        return "、".join([f"{v.value}({v.description})" for k, v in cls.__members__.items()])

class SUBJECT_TYPE(DescriptionEnum):
    CHINESE = ("chinese", "语文")
    MATH = ("math", "数学")
    ENGLISH = ("english", "英语")
    CHEMISTRY = ("chemistry", "化学")
    PHYSICS = ("physics", "物理")
    BIOLOGY = ("biology", "生物")
    HISTORY = ("history", "历史")
    GEOGRAPHY = ("geography", "地理")
    POLITICAL = ("political", "政治")
    OTHER = ("other", "其他，无法明确学科")

class QUESTION_TYPE(DescriptionEnum):
    CHOICE_QUESTION = ("choice_question", "选择题，含单选/多选，通常有 A/B/C/D 选项列表")
    ANSWER_QUESTION = ("answer_question", "问答题/解答题/填空题，无固定选项结构")

class QUESTION_DIFFICULTY_LEVEL_TYPE(DescriptionEnum):
    EASY = ("easy", "简单")
    NORMAL = ("normal", "普通")
    HARD = ("hard", "困难")

class LANGUAGE_TYPE(DescriptionEnum):
    CHINESE = ("chinese", "中文")
    ENGLISH = ("english", "英文")

class VOICE_TYPE(StrEnum):
    ZH_FEMALE_PUTONGHUA = "zh_female_putonghua"
    ZH_MALE_PUTONGHUA = "zh_male_putonghua"
    EN_FEMALE_AMERICAN = "en_female_american"
    EN_MALE_AMERICAN = "en_male_american"
    EN_FEMALE_BRITISH = "en_female_british"
    EN_MALE_BRITISH = "en_male_british"
    
class STAGE_TYPE(DescriptionEnum):
    ELEMENTARY = ("elementary", "小学")
    JUNIOR = ("junior", "初中")
    SENIOR = ("senior", "高中")
    UNIVERSITY = ("university", "大学及以上")

class AUDIO_TYPE(StrEnum):
    MP3 = "mp3"
    WAV = "wav"

class VIDEO_RESOLUTION_TYPE(StrEnum):
    P_720 = "720p"
    P_1080 = "1080p"
    K_2 = "2K"

    @property
    def resolution(self)-> tuple[int, int]:
        if self == VIDEO_RESOLUTION_TYPE.P_720:
            return 1280, 720
        elif self == VIDEO_RESOLUTION_TYPE.P_1080:
            return 1920, 1080
        elif self == VIDEO_RESOLUTION_TYPE.K_2:
            return 2048, 1080
        else:
            raise ValueError("Invalid video resolution type")

class TASK_TYPE(StrEnum):
    DOC_PARSE = "doc_parse"
    READABLE_TTS = "readable_tts"
    QUESTION_EXTRACT = "question_extract"
    QUESTION_SOLVE = "question_solve"
    QUESTION_PARSE = "question_parse"
    QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT = "question_explanation_video_gen_script"
    QUESTION_EXPLANATION_VIDEO_GEN_SYNTHESIS = "question_explanation_video_gen_synthesis"
    QUESTION_EXPLANATION_VIDEO_GEN_SCRIPT_SYNTHESIS = "question_explanation_video_gen_script_synthesis"

class MODEL_PROVIDER(StrEnum):
    OPENAI = "openai"
    ALIYUN = "aliyun"
    MINIMAX = "minimax"
    CUSTOM = "custom"
    MINERU = "mineru"

class TASK_STATUS(IntEnum):
    PENDING = 0
    STARTED = 1
    RETRY = 2
    WAIT_CONFIRM = 3
    CONFIRMED = 4
    SUCCESS = 10
    FAILURE = 20
    REVOKED = 30

# ========================= config schema =======================
class ModelConfig(BaseModel):
    base_url: str = Field(..., description="模型服务地址")
    api_key: str = Field(..., description="模型服务API Key")
    model: str = Field(..., description="模型名字")
    provider: MODEL_PROVIDER = Field(MODEL_PROVIDER.OPENAI, description="模型供应商")

class AgentChatConfig(ModelConfig):
    history_limit: int = Field(10, description="历史轮数限制")

class ImageModelConfig(ModelConfig):
    edit_model: str = Field("", description="图片编辑模型名，留空则复用 model")

class Config(BaseModel):
    class CommonDesc(BaseModel):
        name: str = Field(..., description="项目名字")
        version: str = Field(..., description="项目版本")
        log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(..., description="日志等级")
        env: Literal["dev", "prod"] = Field(..., description="运行环境")
        llm_image_input: Literal["url", "base64"] = Field(
            "url",
            description="调用大模型时图片的传入方式：url 直接传图片地址；base64 传 data url，适用于大模型无法访问的本地对象存储图片"
        )
    
    class MiddlewareConfig(BaseModel):
        class DatabaseDesc(BaseModel):
            host: str = Field(..., description="数据库地址")
            port: int = Field(..., description="数据库端口")
            user: str = Field(..., description="数据库用户名")
            passwd: str = Field(..., description="数据库密码")
            db: str = Field(..., description="数据库名字")

        class StorageDesc(BaseModel):
            domain: str = Field(..., description="OSS域名")
            host: str = Field(..., description="OSS地址")
            public_host: str = Field("", description="浏览器可达的OSS地址，用于生成上传预签名URL；为空时回退 host")
            user: str = Field(..., description="OSS用户名")
            passwd: str = Field(..., description="OSS密码")
            bucket: str = Field(..., description="OSS桶名")
        
        class TemporalDesc(BaseModel):
            server_url: str = Field(..., description="temporalio服务地址")

        database: DatabaseDesc = Field(..., description="数据库配置")
        storage: StorageDesc = Field(..., description="OSS配置")
        temporal: TemporalDesc = Field(..., description="temporal配置")
    
    class ProuductConfig(BaseModel):
        class EduvideoDesc(BaseModel):
            class TtsCloneConfig(ModelConfig):
                limit: int = Field(..., description="音色克隆数量限制")
            class MagicWandConfig(BaseModel):
                text_model: ModelConfig = Field(..., description="魔法棒文本模型配置")
                image_model: ImageModelConfig = Field(..., description="魔法棒图片模型配置")
            class ShareVideoSample(BaseModel):
                title: str = Field(..., description="视频标题")
                url: str = Field(..., description="视频地址")
            class VoiceSamples(BaseModel):
                title: str = Field(..., description="音色标题")
                model_id: str = Field(..., description="音色模型ID")
                url: str = Field(..., description="音色地址")
                voice_type: VOICE_TYPE = Field(..., description="音色类型")
                language: LANGUAGE_TYPE = Field(..., description="音色语言")
            class HomeDisplayInfo(BaseModel):
                notifications: list[str] = Field([], description="通知列表")
                input_placeholder: str = Field("", description="输入框占位符")
                file_tips: list[str] = Field([], description="文件上传提示")

            tts_clone: TtsCloneConfig = Field(..., description="TTS克隆模型配置")
            agent_chat: AgentChatConfig = Field(..., description="agent chat模型配置")
            magic_wand: MagicWandConfig = Field(..., description="魔法棒模型配置")
            share_video_samples: list[ShareVideoSample] = Field(default=[], description="分享视频样本")
            voice_samples: list[VoiceSamples] = Field(default=[], description="音色样本")
            home_display_info: HomeDisplayInfo = Field(HomeDisplayInfo(), description="首页展示信息")

        eduvideo: EduvideoDesc = Field(..., description="eduvideo配置")

    class TasksConfig(BaseModel):
        class TaskConfig(BaseModel):
            class RetryConfig(BaseModel):
                initial_interval: int = Field(1, description="重试初始间隔，单位s")
                maximum_interval: int = Field(10, description="重试最大间隔，单位s")
                maximum_attempts: int = Field(4, description="最大重试次数，单位s")
            task_queue: str = Field(..., description="任务队列")
            fast_task_queue: str = Field("", description="快速任务队列")
            concurrency: int = Field(..., description="activities并发数限制")
            start_to_close_timeout: int = Field(3, description="activity开始到关闭超时时间，单位min")
            max_task_queue_activities_per_second: float = Field(0, description="每秒最大任务队列活动数限制")
            retry_config: RetryConfig = Field(default_factory=RetryConfig, description="重试配置")

        
        class DocParseTask(TaskConfig):
            mineru: ModelConfig = Field(..., description="mineru配置")
        
        class ReadableTTSTask(TaskConfig):
            chinese: ModelConfig = Field(..., description="中文TTS配置")
            english: ModelConfig = Field(..., description="英文TTS配置")
            chinese_translate: ModelConfig = Field(..., description="中文可读性翻译配置")
            latex_translate: ModelConfig = Field(..., description="LaTex可读性翻译配置")
        
        class QuestionExplanationVideoGenScriptTask(TaskConfig):
            handout_generator: ModelConfig = Field(..., description="讲义生成配置")
            image_generator: ImageModelConfig = Field(..., description="图片生成配置")
            
        class QuestionExplanationVideoGenSynthesisTask(TaskConfig):
            render_max_concurrency: int = Field(..., description="渲染最大并发数")
            render_parallel_chunks: int = Field(4, description="渲染分片并行数")

        class QuestionExtractTask(TaskConfig):
            extractor: ModelConfig = Field(..., description="题目提取 LLM 配置")

        class QuestionSolveTask(TaskConfig):
            solver: ModelConfig = Field(..., description="题目解答配置")

        class QuestionParseTask(TaskConfig):
            parser: ModelConfig = Field(..., description="题目解析配置")

        class BaseTask(TaskConfig):
            ...

        server_url: str = Field(..., description="状态服务器地址")
        base_task: BaseTask = Field(..., description="基础任务配置")
        doc_parse: DocParseTask = Field(..., description="文档解析任务配置")
        question_extract: QuestionExtractTask = Field(..., description="试卷题目提取任务配置")
        question_solve: QuestionSolveTask = Field(..., description="问题解答任务配置")
        question_parse: QuestionParseTask = Field(..., description="问题解析任务配置")
        readable_tts: ReadableTTSTask = Field(..., description="可读tts任务配置")
        question_explanation_video_gen_script: QuestionExplanationVideoGenScriptTask = Field(..., description="问题讲解视频生成任务配置")
        question_explanation_video_gen_synthesis: QuestionExplanationVideoGenSynthesisTask = Field(..., description="问题讲解视频合成任务配置")
        max_retries: int = Field(..., description="任务最大重试次数")


    class ServerConfig(BaseModel):
        ip: str = Field(..., description="服务器IP")
        port: int = Field(..., description="服务器端口")
    
    common: CommonDesc = Field(..., description="通用配置")
    middleware: MiddlewareConfig = Field(..., description="中间件配置")
    product: ProuductConfig = Field(..., description="产品配置")
    tasks: TasksConfig = Field(..., description="任务配置")
    server: ServerConfig = Field(..., description="服务器配置")

# ========================= server schema =======================
class RequestInfo(BaseModel):
    user_id: str = Field(..., description="用户ID")
    organization_id: str = Field(..., description="组织ID")
    request_id: str = Field(..., description="请求ID")

class FileObjectInfo(BaseModel):
    data: str | bytes = Field(..., description="文件数据/地址")
    content_type: str | None = Field(None, description="文件内容类型")
    metadata: dict[str, str] = Field({}, description="文件元数据")