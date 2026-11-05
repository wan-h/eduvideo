#!/bin/sh
set -e

HTML_DIR=/usr/share/nginx/html

# 通用替换函数：在所有 JS 文件中将占位符替换为环境变量真实值
replace_env() {
  placeholder="$1"
  value="$2"
  find "$HTML_DIR" -name '*.js' -exec sed -i "s|${placeholder}|${value}|g" {} +
}

# 执行 JS bundle 占位符替换
replace_env "__VITE_BASE_API__" "${VITE_BASE_API}"
replace_env "__VITE_EDUAI_API_PREFIX__" "${VITE_EDUAI_API_PREFIX}"

# 渲染 Nginx 站点配置: listen 端口由 WEB_EDUVIDEO_PORT 决定 (默认 80)
export WEB_EDUVIDEO_PORT="${WEB_EDUVIDEO_PORT:-80}"
envsubst '${WEB_EDUVIDEO_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# 启动 Nginx (站点配置已由上面的模板渲染生成)
exec nginx -g 'daemon off;'
