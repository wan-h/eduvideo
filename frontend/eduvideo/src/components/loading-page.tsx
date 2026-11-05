import { cn } from "@/utils/cn"

interface LoadingPageProps {
  className?: string
}

export function LoadingPage({ className }: LoadingPageProps) {
  return (
    <div
      className={cn(
        "flex h-dvh w-full flex-col items-center justify-center gap-6 bg-background",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        {/* 品牌名 */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">正在加载...</span>
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 animate-[loading-bar_1.5s_ease-in-out_infinite] rounded-full bg-brand" />
      </div>
    </div>
  )
}
