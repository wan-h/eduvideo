import { CheckIcon } from "lucide-react"
import { useState } from "react"

import type { BackgroundType } from "@ask2vid/shared"
import { BACKGROUND_IMAGE_MAP, BACKGROUNDS } from "@ask2vid/shared"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/utils/cn"

interface BackgroundSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: BackgroundType | string
  onSelect: (image: BackgroundType | string) => void
}

export function BackgroundSettingsDialog({
  open,
  onOpenChange,
  current,
  onSelect,
}: BackgroundSettingsDialogProps) {
  const [selected, setSelected] = useState(current)

  const handleSelect = (value: BackgroundType | string) => {
    setSelected(value)
    onSelect(value)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>背景设置</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {BACKGROUNDS.map((bg) => {
            const isSelected = selected === bg.value
            return (
              <button
                key={bg.value}
                type="button"
                onClick={() => handleSelect(bg.value)}
                className={cn(
                  "group relative aspect-video overflow-hidden rounded-lg border-2 transition-colors",
                  isSelected
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <img
                  src={`/${BACKGROUND_IMAGE_MAP[bg.value]}`}
                  alt={bg.label}
                  className="size-full object-cover"
                />
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-white">
                    <CheckIcon className="size-3.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
