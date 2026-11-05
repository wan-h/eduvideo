# @ask2vid/frontend

教学视频前端应用（React + Vite + Remotion Player），使用 pnpm workspace 管理主应用与子包。

## 工作空间结构

```text
frontend/eduvideo/
├── package.json              # @ask2vid/frontend 主应用
├── pnpm-workspace.yaml       # workspace 配置 + catalog（跨包依赖统一版本）
├── Dockerfile                # 三阶段构建：deps → build（typecheck + vite build）→ nginx 静态站点
├── nginx.conf                # 容器内 nginx 配置：SPA 回退、gzip、静态资源缓存
├── deploy/entrypoint.sh      # 启动时替换 JS bundle 中的 __VITE_*__ 占位符
├── src/                      # 主应用源码（见「主应用结构」）
├── shared/                   # @ask2vid/shared 共享包
│   └── src/
│       ├── components/       #   Remotion 视频组件（标题、字幕、解题步骤、背景等）
│       ├── configs/          #   背景、分辨率、场景类型配置
│       ├── markdown/         #   Markdown 渲染组件
│       ├── hooks/            #   资源加载、场景时间轴、分辨率缩放等 hooks
│       ├── styles/           #   主题
│       ├── utils/            #   schema、类型与工具函数
│       ├── fonts.ts          #   字体加载
│       └── Root.tsx          #   Remotion 组合根
└── server/                   # @ask2vid/server 渲染服务包
    ├── src/
    │   ├── index.ts          #   Express 服务入口
    │   ├── api.ts            #   渲染接口
    │   ├── renderer.ts       #   @remotion/renderer 封装
    │   ├── queue.ts          #   渲染队列
    │   ├── storage.ts        #   产物上传（S3）
    │   ├── schemas.ts        #   Zod 请求/响应模型
    │   ├── openapi.ts        #   OpenAPI 文档
    │   └── lib/              #   logger、stage-timer
    ├── render-video.ts       #   CLI 渲染脚本
    └── remotion.config.ts    #   Remotion 配置
```

| 包 | 路径 | 职责 |
|---|---|---|
| `@ask2vid/frontend` | `./` | Web 主应用：对话输入、任务工作台、视频编辑器、分享页 |
| `@ask2vid/shared` | `shared/` | 共享类型 / Zod schema、Markdown 渲染、Remotion 组件、字体与背景配置 |
| `@ask2vid/server` | `server/` | 基于 Express 的 Remotion 渲染服务（独立于主应用运行路径） |

两个子包在 `pnpm-workspace.yaml` 的 `catalog` 中统一 React / Remotion 版本，并以 `"catalog:"` 引用。

## 主应用结构

```text
src/
├── api/                       # 教育 AI 业务接口定义（eduaiApi）
├── components/
│   ├── ui/                    #   shadcn/ui 基础组件
│   ├── video/                 #   视频编辑器（三栏布局、播放器、TTS 工作流）
│   ├── remotion/              #   Remotion Player 组件与 hooks
│   ├── editor/                #   Plate.js 富文本编辑器
│   ├── chat-input/            #   对话输入
│   ├── app-header/            #   全局头部
│   ├── folder-select-dialog/  #   文件夹选择对话框
│   ├── home/                  #   首页组件
│   ├── voice/                 #   音色选择与录音
│   ├── error/                 #   错误提示
│   └── 404/                   #   404 页面
├── hooks/                     # 自定义 hooks
├── i18n/                      # 国际化（语言上下文 + 翻译）
├── layouts/                   # 布局（public-layout / auth-layout）
├── lib/                       # 测试工具
├── pages/
│   ├── studio/                #   工作台：chat-panel（首页对话）、task-list（任务列表）、update（任务详情）
│   └── share/                 #   分享页 /share/:id
├── routes/                    # 路由配置（route.config.tsx）
├── services/                  # ky 封装、query-client、http-hooks
├── store/                     # Zustand 状态
├── utils/                     # cn、api-url、errors、upload 等工具
├── App.tsx                    # 根组件
├── main.tsx                   # 应用入口
└── index.css                  # Tailwind v4 入口
```

### 路由结构

| 路径 | 布局 | 页面 |
|---|---|---|
| `/` | PublicLayout | ChatPanel（对话输入首页） |
| `/studio` | AuthLayout → StudioLayout | TaskListPanel（任务列表） |
| `/studio/:id` | AuthLayout | StudioUpdate（任务详情） |
| `/share/:id` | AuthLayout | SharePage（分享页） |
| `*` | — | Public404 |