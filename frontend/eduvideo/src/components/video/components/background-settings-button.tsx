import { Settings2Icon } from "lucide-react"

interface BackgroundSettingsButtonProps {
  onClick?: () => void
}

export function BackgroundSettingsButton({
  onClick,
}: BackgroundSettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-0 rounded-md p-2 hover:bg-muted-foreground/20"
      aria-label="背景设置"
    >
      <Settings2Icon className="size-5 shrink-0" />
      <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100">
        背景设置
      </span>
    </button>
  )
}
