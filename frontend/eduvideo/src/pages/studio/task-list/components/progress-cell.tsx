interface ProgressCellProps {
  progress: number
}

export function ProgressCell({ progress }: ProgressCellProps) {
  const pct = Math.round(progress)
  let barColor = "bg-slate-400"
  if (pct >= 100) barColor = "bg-emerald-500"
  else if (pct >= 60) barColor = "bg-blue-500"
  else if (pct >= 30) barColor = "bg-amber-500"
  else barColor = "bg-orange-500"

  return (
    <div className="flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  )
}
