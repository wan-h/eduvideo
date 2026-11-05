import { cn } from "@/utils/cn"

interface SectionHeaderProps {
  icon?: React.ReactNode
  title: string
  count?: number
  children?: React.ReactNode
  className?: string
}

export function SectionHeader({
  icon,
  title,
  count,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="text-sm font-semibold">{title}</span>
      {count !== undefined && (
        <span className="ml-auto text-xs text-muted-foreground">
          共 {count} 个项目
        </span>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}
