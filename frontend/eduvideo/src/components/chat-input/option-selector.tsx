import type { LucideIcon } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/utils/cn"

export interface OptionItem {
  value: string
  label: string
}

interface OptionSelectorProps {
  options: OptionItem[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: LucideIcon
  tooltip?: string
}

export function OptionSelector({
  options,
  value,
  onChange,
  placeholder,
  icon: Icon,
  tooltip,
}: OptionSelectorProps) {
  const selected = !!value
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe mounted guard, same pattern as toolbar.tsx:withTooltip
    setMounted(true)
  }, [])

  const trigger = (
    <SelectTrigger
      className={cn(
        "h-8 rounded-full border-transparent text-xs font-medium hover:bg-muted data-placeholder:text-foreground [&>svg:last-child]:hidden",
        selected && "text-brand hover:bg-muted hover:text-brand"
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
  )

  return (
    <Select value={value} onValueChange={onChange}>
      {tooltip && mounted ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <SelectContent
        position="popper"
        side="bottom"
        align="end"
        className="min-w-16"
      >
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
