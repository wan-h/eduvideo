import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AIWandButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
  className?: string
}

export function AIWandButton({
  onClick,
  disabled = false,
  label = "AI 编辑",
  className = "",
}: AIWandButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={`group relative gap-1.5 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 hover:border-purple-300 hover:from-purple-100 hover:to-indigo-100 dark:border-purple-900/50 dark:from-purple-950/40 dark:to-indigo-950/40 dark:text-purple-300 dark:hover:border-purple-800 ${className}`}
      title="使用 AI 魔法棒优化格式、精简表述或排错 (⌘+J)"
    >
      <Sparkles className="size-3.5 animate-pulse text-purple-600 transition-transform group-hover:scale-110 dark:text-purple-400" />
      <span className="font-medium text-xs">{label}</span>
      <kbd className="hidden rounded bg-purple-100/70 px-1 py-0.5 font-mono text-[10px] text-purple-600 dark:bg-purple-900/50 dark:text-purple-300 sm:inline-block">
        ⌘J
      </kbd>
    </Button>
  )
}
