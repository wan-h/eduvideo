import { Public404 } from "@/components/404/public-404"
import { AuthLayout } from "@/layouts/auth-layout"
import { PublicLayout } from "@/layouts/public-layout"
import { SharePage } from "@/pages/share"
import { ChatPanel } from "@/pages/studio/chat-panel"
import { StudioLayout } from "@/pages/studio/studio-layout"
import { TaskListPanel } from "@/pages/studio/task-list"
import { StudioUpdate } from "@/pages/studio/update"
import { type RouteObject } from "react-router"

export const routeConfig: RouteObject[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 公开路由组 - 不需要登录访问
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        element: <ChatPanel />,
      },
    ],
  },
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 应用路由组 - 使用内置 admin 用户
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/studio",
        element: <StudioLayout />,
        children: [{ index: true, element: <TaskListPanel /> }],
      },
      {
        path: "/studio/:id",
        element: <StudioUpdate />,
      },
      {
        path: "/share/:id",
        element: <SharePage />,
      },
    ],
  },
  {
    path: "*",
    element: <Public404 />,
  },
]
