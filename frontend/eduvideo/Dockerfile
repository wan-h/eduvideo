# ============================================================
# Frontend Dockerfile — @ask2vid/frontend
# ============================================================
# 环境要求:
#   - Node.js 24.x (见 .node-version)
#   - pnpm 10.33.3 (见 package.json packageManager 字段)
#   - 构建上下文: 项目根目录 (frontend/)
# ============================================================

# ------------------------------------------------------------
# 阶段 1: 构建
# ------------------------------------------------------------
FROM node:24-slim AS build

WORKDIR /app

# 配置 npm/pnpm 镜像源，并安装 pnpm (使用 packageManager 指定的版本)
RUN npm config set registry https://registry.npmmirror.com --global && \
    corepack enable && corepack prepare pnpm@10.34.4 --activate && \
    pnpm config set registry https://registry.npmmirror.com --global

# 仅复制依赖清单：锁文件不变时 install 层命中缓存，源码改动不会触发重装
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json

# pnpm store 使用 BuildKit 缓存，减少重复下载
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 复制源码（node_modules 由 .dockerignore 排除，不会覆盖 install 结果）
COPY . .

# 声明环境变量占位符（构建时写入 JS bundle，运行时由 entrypoint.sh 替换）
ENV VITE_BASE_API=__VITE_BASE_API__
ENV VITE_EDUAI_API_PREFIX=__VITE_EDUAI_API_PREFIX__

# build 脚本内已包含 shared 构建与 tsc -b，typecheck 由 CI verify 覆盖，镜像内不重复
RUN pnpm build

# ------------------------------------------------------------
# 阶段 2: 生产镜像 (Nginx 静态资源服务器)
# ------------------------------------------------------------
FROM nginx:1.27.5 AS production

# 复制构建产物
COPY --from=build /app/dist /usr/share/nginx/html

# 复制运行时入口脚本（环境变量占位符替换）
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 静态站点配置模板（listen 端口由 WEB_EDUVIDEO_PORT 决定，entrypoint 启动时渲染）
COPY nginx.conf /etc/nginx/templates/default.conf.template

# 暴露端口（默认 80，实际监听由运行时 WEB_EDUVIDEO_PORT 决定）
EXPOSE 80

# 健康检查 (nginx 镜像自带 curl，无 wget)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS -o /dev/null "http://localhost:${WEB_EDUVIDEO_PORT:-80}/health" || exit 1

# 启动入口脚本（执行 sed 替换后启动 Nginx）
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
