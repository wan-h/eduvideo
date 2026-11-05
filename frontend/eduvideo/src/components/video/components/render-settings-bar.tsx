import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRenderSettingsStore } from "@/store/render-settings-store"

const SPEED_OPTIONS = [
  { label: "0.5x", value: "0.5" },
  { label: "0.75x", value: "0.75" },
  { label: "1x", value: "1" },
  { label: "1.25x", value: "1.25" },
  { label: "1.5x", value: "1.5" },
  { label: "2x", value: "2" },
] as const

interface RenderSettingsBarProps {
  visible: boolean
}

export function RenderSettingsBar({ visible }: RenderSettingsBarProps) {
  const speed = useRenderSettingsStore((s) => s.speed)
  const setSpeed = useRenderSettingsStore((s) => s.setSpeed)

  if (!visible) return null

  return (
    <div className="flex items-center gap-1">
      <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
        <SelectTrigger className="h-7 w-auto gap-1 px-1.5 text-xs">
          速率 <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPEED_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
