"use client"

import { cn } from "@/utils/cn"

/** 骨架屏 shimmer 效果 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r before:from-muted/50 before:via-muted before:to-muted/50",
        className
      )}
      {...props}
    />
  )
}

/** 左侧面板骨架屏 */
function LeftPanelSkeleton() {
  return (
    <aside className="flex h-full w-72 flex-col border-r border-border bg-card">
      {/* 面板头部 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>

      {/* 片段列表 */}
      <div className="flex-1 space-y-2 overflow-hidden p-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border p-2.5"
          >
            <Skeleton className="h-12 w-12 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </aside>
  )
}

/** 中央视频预览骨架屏 */
function CenterPanelSkeleton() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-muted/30">
      {/* 视频预览区域 */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl bg-muted">
          {/* 播放图标骨架 */}
          <div className="flex h-full w-full flex-col items-center justify-center">
            <Skeleton className="mb-4 h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* 控制条骨架 */}
      <div className="m-6 rounded-lg border bg-card px-6 py-4">
        {/* 时间轴 */}
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* 播放按钮 */}
        <div className="flex items-center justify-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </div>
    </main>
  )
}

/** 右侧字幕面板骨架屏 */
function RightPanelSkeleton() {
  return (
    <aside className="flex h-full w-80 flex-col border-l border-border bg-card">
      {/* 面板头部 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>

      {/* 字幕列表 */}
      <div className="flex-1 space-y-2 overflow-hidden p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full rounded-lg border p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </aside>
  )
}

/** 编辑器布局骨架屏 */
export function EditorLayoutSkeleton() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <LeftPanelSkeleton />
      <CenterPanelSkeleton />
      <RightPanelSkeleton />
    </div>
  )
}
