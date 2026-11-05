import { cn } from "@/utils/cn"
import type { ReactNode } from "react"
import { Brand } from "./brand"
import { UserNav } from "./user-nav"

interface AppHeaderProps {
  children?: ReactNode
  variant?: "compact" | "expanded"
  /** 从顶部偏移的像素值（如通知 banner 高度） */
  topOffset?: number
}

const variantClasses = {
  expanded: "h-16 px-6 lg:px-12",
  compact: "h-12 px-4",
} as const

export function AppHeader({
  children,
  variant = "compact",
  topOffset,
}: AppHeaderProps) {
  const heightClass = variantClasses[variant]
  const isCompact = variant === "compact"

  return (
    <header
      className={cn(
        "fixed right-0 left-0 z-50 flex items-center justify-between bg-background/80 backdrop-blur",
        isCompact && "border-b",
        heightClass
      )}
      style={topOffset ? { top: `${topOffset}px` } : { top: 0 }}
    >
      <div className="shrink-0">
        <Brand isCompact={isCompact} />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="shrink-0">
        <UserNav isCompact={isCompact} />
      </div>
    </header>
  )
}
