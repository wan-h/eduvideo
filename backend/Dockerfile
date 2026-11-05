# ============================================================
# Multi-stage Dockerfile — Python Backend (统一镜像)
# ============================================================
# 构建命令(上下文为仓库根目录, 需要读取 frontend/eduvideo):
#   docker build -t eduvideo-backend:latest -f backend/Dockerfile .
# ============================================================

# ────────────────────────────────────────────────────────────
# Stage 1: Python Builder
# ────────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm AS python-builder

WORKDIR /app

# Install uv（官方镜像为多架构: linux/amd64 + linux/arm64）
COPY --from=astral/uv:latest /uv /uvx /bin/

ENV UV_LINK_MODE=copy

# Copy only the dependency files to cache the installation
COPY backend/pyproject.toml backend/uv.lock ./

# Install dependencies into a virtual environment
# We use --mount=type=cache to speed up re-builds
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# ────────────────────────────────────────────────────────────
# Stage 2: Node Runtime — 提供 node / npm / corepack
# ────────────────────────────────────────────────────────────
FROM node:24-slim AS node-runtime

# ────────────────────────────────────────────────────────────
# Stage 3: Frontend Builder — 渲染服务依赖与构建产物
# ────────────────────────────────────────────────────────────
# 依赖的安装/删除都发生在本阶段，最终镜像只复制产物，
# 因此不会把 devDependencies 与中间层计入镜像体积。
FROM node:24-slim AS frontend-builder

WORKDIR /fe

RUN corepack enable && \
    corepack prepare pnpm@10.34.4 --activate && \
    pnpm config set registry https://registry.npmmirror.com --global

# 仅依赖清单: 锁文件不变时 install 层命中缓存
COPY frontend/eduvideo/package.json frontend/eduvideo/pnpm-lock.yaml \
     frontend/eduvideo/pnpm-workspace.yaml ./
COPY frontend/eduvideo/shared/package.json shared/package.json
COPY frontend/eduvideo/server/package.json server/package.json

# 只安装渲染服务（@ask2vid/server 及 workspace 依赖 @ask2vid/shared）所需依赖
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @ask2vid/server...

COPY frontend/eduvideo/tsconfig.base.json ./
COPY frontend/eduvideo/shared/ ./shared/
COPY frontend/eduvideo/server/ ./server/

# 构建后重装为纯运行时依赖（--prod）
RUN pnpm --filter @ask2vid/shared build && \
    pnpm --filter @ask2vid/server build && \
    rm -rf node_modules shared/node_modules server/node_modules && \
    pnpm install --frozen-lockfile --prod --filter @ask2vid/server...

# ────────────────────────────────────────────────────────────
# Stage 4: Runtime — Python + Node.js + Chromium
# ────────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm

# ── 设置环境变量 ──
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=Asia/Shanghai \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CHROMIUM_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=true

# ── 安装系统依赖 ──
# - libpq5:         PostgreSQL 客户端库
# - ffmpeg:         音视频处理
# - libmagic1:      文件类型检测
# - wget:           健康检查 / 工具
# - poppler-utils:  PDF 处理
# - libreoffice-writer: Word 文档 (doc/docx) 转 PDF
# - fonts-*:        文档解析或PDF生成可能需要的字体
# apt 缓存挂载到 BuildKit cache: 层缓存失效时仍可复用已下载的包
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get -o Acquire::AllowInsecureRepositories=true -o Acquire::AllowDowngradeToInsecureRepositories=true update && \
    apt-get install -y --allow-unauthenticated --no-install-recommends \
    libpq5 ffmpeg libmagic1 wget poppler-utils libreoffice-writer \
    chromium libgl1-mesa-dri libgl1-mesa-glx libegl1 \
    fontconfig \
    fonts-noto-cjk \
    fonts-liberation \
    fonts-crosextra-carlito \
    fonts-stix \
    && mkdir -p /etc/fonts \
    && echo '<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><match target="pattern"><test qual="any" name="family"><string>宋体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>SimSun</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>微软雅黑</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>Microsoft YaHei</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>楷体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>KaiTi</string></test><edit name="family" mode="assign" binding="same"><string>Noto Serif CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>黑体</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match><match target="pattern"><test qual="any" name="family"><string>SimHei</string></test><edit name="family" mode="assign" binding="same"><string>Noto Sans CJK SC</string></edit></match></fontconfig>' > /etc/fonts/local.conf \
    && fc-cache -fv \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# ── 复制 Node.js 运行时 ──
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack && \
    ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx && \
    ln -s /usr/local/bin/node /usr/local/bin/nodejs && \
    npm config set registry https://registry.npmmirror.com --global && \
    corepack enable && \
    corepack prepare pnpm@10.34.4 --activate && \
    pnpm config set registry https://registry.npmmirror.com --global

# ── 工作目录 ──
WORKDIR /app

# ── 复制 Python 虚拟环境 ──
COPY --from=python-builder /app/.venv /app/.venv

ENV VIRTUAL_ENV=/app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# ── Remotion 渲染前端: 只复制 frontend-builder 的产物（prod node_modules + dist） ──
WORKDIR /app/src/tasks/question_explanation_video_gen/video_synthesis/remotion_template/frontend

COPY --from=frontend-builder /fe/node_modules ./node_modules
COPY --from=frontend-builder /fe/shared ./shared
COPY --from=frontend-builder /fe/server ./server
# pnpm run 需要当前目录下的 package.json（render:video 脚本定义在此），缺失会导致 ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND
COPY --from=frontend-builder /fe/package.json ./package.json

# backend 代码放在最后: 后端提交不会让上面的前端层失效
WORKDIR /app
COPY backend/ ./

# Entry point using python to run main.py
CMD ["python","main.py"]