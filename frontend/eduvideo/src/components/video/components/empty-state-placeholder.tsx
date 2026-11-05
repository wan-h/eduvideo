"use client"

import { cn } from "@/utils/cn"
import { Plus } from "lucide-react"

interface EmptyStatePlaceholderProps {
  label: string
  onClick: () => void
  className?: string
}

export function EmptyStatePlaceholder({
  label,
  onClick,
  className,
}: EmptyStatePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex h-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-brand/50 bg-brand/5 transition-colors hover:border-solid hover:border-brand",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-brand">
        <Plus className="size-4" />
        <span>{label}</span>
      </div>
    </div>
  )
}
