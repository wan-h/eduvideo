/// <reference types="vitest" />
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { defineConfig, loadEnv } from "vite"
import { createProxyLogger } from "./vite.proxy-logger"

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")

  return {
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // 开发时直接指向 shared 源码，无需构建；生产构建使用 dist
        ...(command === "serve" && {
          "@ask2vid/shared": path.resolve(__dirname, "./shared/src/index.ts"),
        }),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router"],
            "vendor-remotion": ["remotion", "@remotion/player"],
            "vendor-plate": [
              "platejs",
              "@platejs/basic-nodes",
              "@platejs/dnd",
              "@platejs/list-classic",
              "@platejs/markdown",
              "@platejs/math",
              "@platejs/media",
              "@platejs/resizable",
              "@platejs/selection",
              "@platejs/table",
            ],
            "vendor-ui": [
              "radix-ui",
              "lucide-react",
              "sonner",
              "@tanstack/react-table",
              "@tanstack/react-query",
              "react-resizable-panels",
              "class-variance-authority",
              "clsx",
              "tailwind-merge",
              "next-themes",
            ],
            "vendor-utils": [
              "lodash-es",
              "ky",
              "immer",
              "zustand",
              "zod",
              "uuid",
              "react-error-boundary",
              "react-markdown",
            ],
            "vendor-katex": [
              "katex",
              "remark-math",
              "rehype-katex",
              "remark-gfm",
            ],
          },
        },
      },
    },
    test: {
      environment: "happy-dom",
      globals: true,
      exclude: ["server/dist/**", "**/node_modules/**", "**/dist/**"],
      coverage: {
        provider: "v8",
        include: [
          "src/utils/cn.ts",
          "src/utils/errors.ts",
          "src/utils/api-url.ts",
          "src/utils/form-data.ts",
          "src/utils/file-validator.ts",
          "src/hooks/use-page-drag-detector.ts",
          "src/hooks/use-seo-meta.ts",
          "src/i18n/language-provider.tsx",
          "src/i18n/translations.ts",
          "src/pages/studio/task-list/hooks/use-folder-list.ts",
          "src/pages/studio/hooks/use-file-upload.ts",
          "src/pages/studio/hooks/use-script-submit.ts",
          "src/pages/studio/hooks/use-share-videos.ts",
          "src/pages/studio/update/hooks/use-script-task-detail.ts",
          "src/pages/share/hooks/use-conversation-chat.ts",
          "src/components/video/store/*.ts",
          "src/components/video/utils/scene-frame.ts",
          "src/components/video/hooks/use-tts-workflow.ts",
          "src/components/video/hooks/use-tts-task.ts",
          "src/store/*.ts",
          "src/services/query-client.ts",
        ],
        thresholds: {
          lines: 80,
          statements: 80,
        },
      },
    },
    server: {
      host: "0.0.0.0",
      proxy: {
        "/base": {
          target: env.VITE_BASE_API,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/base/, ""),
          configure: createProxyLogger(mode, {
            proxyReq: true,
          }),
        },
        "/api": {
          target: env.VITE_BASE_API,
          changeOrigin: true,
          secure: false,
          configure: createProxyLogger(mode, {
            proxyReq: true,
          }),
        },
      },
    },
  }
})
