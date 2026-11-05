# Backend

FastAPI 后端服务：HTTP API、Temporal 任务编排与 Remotion 视频渲染。

## 项目结构

```text
backend/
├── main.py                      # 应用入口（Uvicorn）
├── pyproject.toml               # 依赖声明（uv 管理）
├── alembic.ini                  # Alembic 配置
├── alembic/                     # 迁移环境与版本脚本
│   ├── env.py                   #   绑定 Base.metadata
│   └── versions/                #   数据库 Schema 迁移脚本
├── configs/                     # config.example.yaml（本地模板）/ config.prod.yaml（容器部署）
├── scripts/                     # migrate.py（建库 + 迁移）、start_dev.py（本地启动）、e2e.py 等
├── logs/                        # 运行日志（按时间戳分目录）
└── src/
    ├── schema.py                # 全局 Pydantic 模型与枚举
    ├── middleware/              # 基础设施客户端
    │   ├── database/engine.py   #   SQLAlchemy 异步/同步引擎、Base、Session 工厂
    │   ├── redis/client.py      #   Redis 客户端
    │   ├── storage/client.py    #   S3 异步客户端（上传、下载、预签名 URL）
    │   └── temporalio/client.py #   Temporal 客户端
    ├── server/                  # FastAPI 服务层
    │   ├── app.py               #   应用工厂、生命周期管理、路由注册
    │   ├── middleware.py        #   CORS 等中间件
    │   ├── exceptions.py        #   自定义异常体系
    │   ├── depends.py           #   依赖注入
    │   ├── api/                 #   API 路由（eduvideo / task / storage）
    │   ├── dal/                 #   数据访问层
    │   ├── models/              #   SQLAlchemy ORM 模型
    │   ├── schema/              #   服务层 Pydantic 模型
    │   └── services/            #   业务服务（AI 编辑器等）
    ├── tasks/                   # Temporal Workflow / Activity 与各队列 Worker
    │   ├── base/                #   任务状态更新等基础任务
    │   ├── doc_parse/           #   文档解析（图片 / PDF → Markdown）
    │   ├── readable_tts/        #   TTS 配音（worker / fast_worker 快速队列）
    │   ├── question_extract/    #   题目提取
    │   ├── question_parse/      #   题干、选项结构化解析
    │   ├── question_solve/      #   题目解答
    │   └── question_explanation_video_gen/
    │       ├── script_gen/      #     视频脚本生成
    │       └── video_synthesis/ #     视频合成（含 remotion_template 渲染模板）
    └── utils/                   # env 路径常量、config_parser、logger、func
```

各任务队列的职责与单独启动命令见 [src/tasks/README.md](src/tasks/README.md)。

## 本地配置

```bash
cp configs/config.example.yaml configs/config.dev.yaml   # 首次
```

`config.dev.yaml` 已预填本地中间件连接信息与开发默认密码，补全各模型 `api_key` 后即可本地启动。该文件已被 `.gitignore` 忽略，请勿提交；敏感值也可通过环境变量注入（如 `POSTGRES_PASSWORD`、`LLM_QUESTION_PARSE_API_KEY`），优先级高于 YAML，详见[开发指南](../docs/development.md#配置说明)。