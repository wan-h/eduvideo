import type { ReactNode } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

interface EditorLayoutProps {
  /** 左侧边栏内容 */
  leftSidebar: ReactNode
  /** 中间主内容区 */
  content: ReactNode
  /** 右侧边栏内容 */
  rightSidebar: ReactNode
}

/**
 * 视频编辑器三栏布局组件
 * 提供可调整大小的左侧边栏、中间内容区和右侧边栏
 */
export function EditorLayout({
  leftSidebar,
  content,
  rightSidebar,
}: EditorLayoutProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full">
      <ResizablePanel defaultSize="20" minSize="16" maxSize="30">
        {leftSidebar}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="75">{content}</ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize="20" minSize="16" maxSize="30">
        {rightSidebar}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
