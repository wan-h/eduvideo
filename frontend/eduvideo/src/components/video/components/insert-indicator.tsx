"use client"

interface InsertIndicatorProps {
  label: string
  onClick: () => void
}

export function InsertIndicator({ label, onClick }: InsertIndicatorProps) {
  return (
    <div
      className="group/insert relative flex h-4 cursor-pointer items-center"
      onClick={onClick}
    >
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-brand opacity-0 transition-opacity group-hover/insert:opacity-100" />
      <div className="absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded bg-brand px-2 py-0.5 text-xs font-medium text-brand-foreground opacity-0 transition-opacity group-hover/insert:opacity-100">
        {label}
      </div>
    </div>
  )
}
