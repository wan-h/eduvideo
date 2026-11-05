# 开发指南

面向本地开发、调试与二次开发的完整说明。只想快速跑起来，请看 README 的 [快速开始](../README.md#快速开始)。

## 目录

- [前置要求](#前置要求)
- [运行完整栈（Docker Compose）](#运行完整栈docker-compose)
- [本地开发（前后端热更新）](#本地开发前后端热更新)
- [配置说明](#配置说明)
- [数据库迁移](#数据库迁移)
- [代码质量与测试](#代码质量与测试)
- [镜像与发布](#镜像与发布)
- [常见问题](#常见问题)

## 前置要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Docker + Compose v2 | 24+ | 中间件与整套部署 |
| Python + [uv](https://docs.astral.sh/uv/) | 3.12 | 后端本地开发 |
| Node | 24（见 `.node-version`） | 前端本地开发 |
| pnpm | 10.34.4（`corepack enable` 后自动匹配） | 前端包管理 |
| libmagic | — | 后端解析上传文件，macOS 执行 `brew install libmagic` |

## 运行完整栈（Docker Compose）

以下命令均在 `docker/` 目录执行（compose 会把同目录的 `.env` 和相对路径当作基准）。

### 1. 准备环境变量

```bash
cd docker
cp .env.example .env
```

按需修改 `docker/.env`，重点关注：

| 变量 | 说明 |
|---|---|
| `PUBLIC_HOST` | 对外访问主机名/IP（不含端口），如 `localhost` 或服务器域名。前端页面、MinIO 预签名 URL、`STORAGE_DOMAIN` 均以它为基准，**必须同时被用户浏览器和后端渲染容器访问到**（默认 `localhost` 仅适合本机调试，容器内渲染会取不到素材） |
| `POSTGRES_PASSWORD` / `STORAGE_ROOT_PASSWORD` | 数据库与对象存储密码，已预填本地开发默认值，生产环境务必替换 |
| `LLM_*_API_KEY` | 各环节模型密钥，完整清单见 `docker/.env.example`，留空的模型会在对应环节失败 |
| `NGINX_HTTP_PORT` / `STORAGE_API_PORT` | 统一入口端口（默认 80）/ MinIO API 端口（默认 9000）。所有服务间地址都由这两个端口变量 + `PUBLIC_HOST` 派生，改端口无需再同步其他配置 |

### 2. 启动

```bash
docker compose up -d          # 首次会拉取镜像，并初始化仓库根目录的 volumes/db、volumes/minio
docker compose ps             # 确认各服务 healthy
```

### 3. 对象存储初始化（已自动）

一次性服务 `storage-init` 在 minio 健康后自动执行，幂等，每次 `up` 都会跑一次：

1. 创建 bucket：`eduvideo`（取 `STORAGE_BUCKET`）；
2. 设置匿名只读策略——前端播放、渲染器下载媒体都依赖匿名读。

```bash
docker compose logs storage-init     # 确认输出「bucket 已创建/已存在」+「匿名只读策略已设置」
```

如需人工核对或调整，可打开对象存储控制台 <http://localhost:9001>（端口取 `STORAGE_CONSOLE_PORT`，账号见 `docker/.env` 的 `STORAGE_ROOT_USER` / `STORAGE_ROOT_PASSWORD`），或用 `mc` 手工干预：

```bash
mc alias set local http://localhost:9000 <STORAGE_ROOT_USER> <STORAGE_ROOT_PASSWORD>
mc mb --ignore-existing local/eduvideo
mc anonymous set download local/eduvideo
```

### 4. 访问入口

| 入口 | 地址 |
|---|---|
| 前端 | <http://localhost> |
| 接口文档（Swagger） | <http://localhost/docs> |
| 对象存储控制台 | <http://localhost:9001> |
| PostgreSQL（经 PgBouncer） | `localhost:5432` |
| Temporal gRPC | `localhost:7233` |
| Temporal UI | <http://localhost:8080> |

> 首次启动时，两个一次性服务会先执行：`storage-init` 建好对象存储 bucket / 匿名读策略，`srv-education-api-migrate` 执行数据库迁移（`alembic upgrade head`，历史库自动校验并 `stamp head`）；两者都成功后 API 与 Workers 才会启动，Temporal namespace 仍自动注册。

### 5. 常用命令

```bash
docker compose logs -f srv-education-api                        # 查看 API 日志
docker compose logs -f srv-education-api-migrate                # 查看数据库迁移日志
docker compose logs -f srv-education-worker-readable_tts        # 查看某个 worker 日志
docker compose restart nginx                                    # 改完 nginx 配置后重启
docker compose down                                             # 停止（保留数据）
```

数据保存在仓库根目录的 `volumes/`（已被 `.gitignore` 忽略），彻底清空需停服后手动删除该目录。

## 本地开发（前后端热更新）

本地开发时只把**中间件**放进 Docker，前后端跑在宿主机上。

### 1. 启动中间件

```bash
cd docker
cp .env.example .env    # 首次需要
docker compose -f docker-compose-middleware.yaml up -d
```

该文件只包含中间件：`postgres`、`pgbouncer`、`minio`、`storage-init`，以及 Temporal 全家桶（`temporal-admin-tools`、`temporal-server`、`temporal-create-namespace`、`temporal-ui`），不会启动 `docker-compose-app.yaml` 中的 API / Workers / 前端，也不会启动 nginx（nginx 依赖 API 与前端）。

> `temporal-admin-tools`、`temporal-create-namespace`、`storage-init` 都是一次性任务，执行完退出属正常现象。

`config.dev.yaml` 中的默认连接信息：

| 依赖 | 地址 |
|---|---|
| PostgreSQL | `127.0.0.1:5432`（PgBouncer） |
| MinIO S3 | `http://127.0.0.1:9000` |
| Temporal | `127.0.0.1:7233` |
| Temporal UI | <http://localhost:8080> |

> 如果本机没有 Temporal，也可以直接用 Temporal CLI 起一个开发版：`temporal server start-dev --port 7233`。

### 2. 启动后端

```bash
cd backend
uv sync

# 首次：从模板生成本地配置，再补全各模型 API Key
cp configs/config.example.yaml configs/config.dev.yaml

uv run python main.py
```

- `SERVER_ENV` 缺省即 `dev`，读取 `configs/config.dev.yaml`，开启 uvicorn 自动重载；
- `config.dev.yaml` 已被 `.gitignore` 忽略，密码与密钥只保留在本地，请勿提交；
- 服务地址 <http://localhost:8000>，接口文档 <http://localhost:8000/docs>。

需要联调异步任务时，按需再开 worker：

```bash
cd backend
uv run python -m src.tasks.readable_tts.worker
uv run python -m src.tasks.question_extract.worker
uv run python -m src.tasks.question_explanation_video_gen.video_synthesis.worker
```

可用队列与 compose 中的 `srv-education-worker-*` 服务一一对应：`base_task`、`doc_parse`、`readable_tts`、`fast_readable_tts`、`question_extract`、`question_parse`、`question_solve`、`question_explanation_video_gen_script`、`question_explanation_video_gen_synthesis`。各队列职责见 [backend/src/tasks/README.md](../backend/src/tasks/README.md)。

#### 视频合成（Remotion）额外准备

导出视频由 `frontend/eduvideo/server` 的 Remotion 渲染服务执行：worker 以 `backend/src/tasks/question_explanation_video_gen/video_synthesis/remotion_template/frontend` 作为工作目录调用 `pnpm render:video`。容器镜像构建时会把前端产物复制到该目录；本地该目录不存在（在 `backend/.gitignore` 中被忽略），不处理会报：

> Task failed: [Errno 2] No such file or directory: '.../remotion_template/frontend'

首次本地开发需安装渲染依赖、构建 shared，并把该目录软链到前端：

```bash
# 1) 安装依赖并构建 shared（仅首次）
cd frontend/eduvideo
pnpm install
pnpm --filter @ask2vid/shared build

# 2) 软链渲染目录
cd ../../backend/src/tasks/question_explanation_video_gen/video_synthesis/remotion_template
ln -sfn ../../../../../../frontend/eduvideo frontend
```

> macOS 可额外设置 `export CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` 复用系统 Chrome；不设置时 Remotion 首次渲染会自动下载 Chrome Headless Shell（约 92MB）。

### 3. 启动前端

```bash
cd frontend/eduvideo
corepack enable
pnpm install
pnpm dev          # 对应 .env.development，接口指向 http://localhost:8000
```

浏览器打开 <http://localhost:5173>，Vite 已配置接口代理，本地联调无需处理跨域。

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 本地联调，后端指向 `http://localhost:8000`（`.env.development`） |
| `pnpm build` / `pnpm preview` | 生产构建与预览 |
| `pnpm check:all` | format + typecheck + lint + build 全量检查 |

## 配置说明

### 配置文件

| 文件 | 是否提交 | 说明 |
|---|---|---|
| `config.example.yaml` | 是 | 本地配置模板，默认指向本机中间件（`127.0.0.1`）与各模型服务地址；`passwd` 预填本地开发默认值，`api_key` 留空 |
| `config.dev.yaml` | 否（`.gitignore`） | 从模板复制即可，补全各模型密钥后仅保留在本地；后端启动与本地测试读取它 |
| `config.prod.yaml` | 是 | 容器部署配置（compose 内 `SERVER_ENV=prod`），敏感值由 `docker/.env` 注入 |

> 缺少 `config.dev.yaml` 时，后端启动与本地 `pytest` 会报 `config.dev.yaml not found`，先从模板复制一份即可；CI 由流水线自动从模板生成。

### 环境与优先级

- `SERVER_ENV` 决定加载哪个配置文件：缺省 `dev`，`prod` 用于容器部署（compose 内已固定 `SERVER_ENV=prod`）；
- 优先级：**环境变量 > `config.{env}.yaml`**，覆盖逻辑见 `backend/src/utils/config_parser.py`；
- 所有模型服务的 `base_url` / `api_key` / `model` / `provider`（仅部分配置有 provider）均可在 `docker/.env` 中覆盖，变量规则为 `LLM_<配置位置>_{BASE_URL|API_KEY|MODEL|PROVIDER}`（如 `LLM_QUESTION_PARSE_API_KEY`），完整清单见 `docker/.env.example`；留空则沿用 YAML 中的值。

### 两套配置的差异

| 配置项 | dev（宿主机运行） | prod（compose 运行） |
|---|---|---|
| `database.host` | `127.0.0.1:5432` | `pgbouncer:5432` |
| `storage.host`（后端 S3 SDK） | `http://127.0.0.1:9000` | `http://minio:9000` |
| `storage.domain`（返回给浏览器的前缀） | `http://localhost:9000/eduvideo` | `http://<服务器地址>/storage` |
| `storage.public_host`（预签名上传，浏览器可达） | `http://127.0.0.1:9000` | `http://<服务器地址>:9000` |
| `temporal.server_url` | `127.0.0.1:7233` | `temporal-server:7233` |
| `tasks.server_url` | `http://127.0.0.1:8000` | `http://srv-education-api:8000` |

`storage.host` 与 `storage.domain` 的区别很关键：前者是后端上传/下载用的 S3 endpoint（容器内网即可），后者会拼进返回给前端的媒体 URL，必须从浏览器可达。生产环境统一走 nginx 的 `/storage/*`，由 nginx 转发到 MinIO 的 `eduvideo` bucket。

### 前端环境变量

`frontend/eduvideo` 通过 `.env`（所有模式）与 `.env.development`（`pnpm dev`）声明两个变量：

| 变量 | 说明 |
|---|---|
| `VITE_BASE_API` | 后端地址（协议 + host + port）。开发模式作为 Vite 代理 target；生产留空，浏览器走同源相对路径 |
| `VITE_EDUAI_API_PREFIX` | 后端全局路径段，对应 backend 的 `GLOABLE_PREFIX = "/api/{config.common.name}"` |

请求路径统一为 `{VITE_BASE_API}/api/{VITE_EDUAI_API_PREFIX}/eduvideo/v0/...`：开发时 Vite 把 `/api`、`/base` 代理到 `VITE_BASE_API`（`/api` 保持原路径，`/base` 去掉前缀），本地联调无需处理跨域。Docker 构建时 `Dockerfile` 写入 `__VITE_*__` 占位符，容器启动时由 `deploy/entrypoint.sh` 替换为运行时环境变量，同一镜像可对接不同后端。

## 数据库迁移

Schema 变更统一由 Alembic 管理：容器启动时一次性服务 `srv-education-api-migrate` 执行 `python scripts/migrate.py`（建库 → 历史库校验并 `stamp head` → `upgrade head`），本地 `scripts/start_dev.py` 启动前也会执行同一脚本。

```bash
cd backend
uv run alembic current                           # 查看当前版本
uv run alembic revision --autogenerate -m "描述"  # 按 ORM 变更生成迁移脚本
uv run alembic upgrade head                      # 应用到最新版本
uv run alembic downgrade -1                      # 回退一个版本
```

## 代码质量与测试

```bash
# 后端
cd backend
uv run ruff check .
uv run ruff format --check .
uv run pytest

# 前端
cd frontend/eduvideo
pnpm lint
pnpm typecheck
pnpm test
```

## 镜像与发布

| 镜像 | Dockerfile | 构建上下文 | 说明 |
|---|---|---|---|
| `srv-eduvideo-api` | `backend/Dockerfile` | 仓库根目录 | 后端 API + worker + Remotion 渲染（内含前端渲染 workspace） |
| `web-eduvideo` | `frontend/eduvideo/Dockerfile` | `frontend/eduvideo` | 前端 SPA（nginx 静态站点） |

推送 `v*` tag 会触发 GitHub Actions：[`cicd.yml`](../.github/workflows/cicd.yml) 按 `changes → verify → build` 执行，按变更范围决定重建哪些镜像（前端改动会连带重建后端镜像），并推送到阿里云容器镜像服务。

手动构建：

```bash
# 后端（上下文为仓库根目录）
docker build -t srv-eduvideo-api:dev -f backend/Dockerfile .

# 前端
docker build -t web-eduvideo:dev -f frontend/eduvideo/Dockerfile frontend/eduvideo
```

## 常见问题

| 现象 | 排查方向 |
|---|---|
| API 启动报 Temporal 连接失败 | 未启动 `temporal-server`，或 `TEMPORAL_SERVER_HOST` 指向错误 |
| 图片/视频 403、播放空白 | MinIO bucket 未创建或未开匿名读（`mc anonymous set download`） |
| 页面能开但接口 404 | nginx 未启动，或前端镜像的 `VITE_BASE_API` 不为空导致直连了旧地址 |
| 80 端口被占用 | 修改 `docker/.env` 的 `NGINX_HTTP_PORT`，访问地址同步加端口 |
| 后端启动报 `libmagic` 缺失 | macOS `brew install libmagic`，Debian/Ubuntu `apt install libmagic1` |
| 后端启动报 `config.dev.yaml not found` | 未生成本地配置，执行 `cd backend && cp configs/config.example.yaml configs/config.dev.yaml` 并填写密码/密钥 |
| 视频导出报 `remotion_template/frontend` 不存在 | 本地未软链渲染目录，见「视频合成（Remotion）额外准备」 |
| 首次 `docker compose up` 很慢 | 首次需拉取 postgres/minio/temporal 等镜像，可预先配置镜像加速 |
| 拉取 minio 镜像 401 / 404 | MinIO 社区版已停更，Docker Hub 仓库 2026-09 下架、quay.io 仅剩冻结镜像且匿名拉取可能 401；默认已改用兼容 fork `pgsty/silo`（见 `docker/.env` 的 `STORAGE_IMAGE`），要回到官方镜像需 `docker login quay.io` 并把 `STORAGE_IMAGE` 改为 `quay.io/minio/minio:RELEASE.2025-10-15T17-29-55Z` |
