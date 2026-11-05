import type { ComponentType } from "react"

import { cn } from "@/utils/cn"

export interface SegmentedControlItem {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
}

interface SegmentedControlProps {
  items: SegmentedControlItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}

export function SegmentedControl({
  items,
  activeId,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div className={cn("flex gap-1 rounded-lg bg-muted p-1", className)}>
      {items.map((item) => {
        const isActive = item.id === activeId
        const Icon = item.icon

        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="mr-1.5 size-4" />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
