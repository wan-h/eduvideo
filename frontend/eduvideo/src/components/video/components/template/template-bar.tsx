import { Settings2Icon } from "lucide-react"
import { useState } from "react"

import { useDraftStore } from "@/store/draft-store"
import { useRenderSettingsStore } from "@/store/render-settings-store"
import { cn } from "@/utils/cn"

import { TemplatePanel, type TemplateItemData } from "./template-panel"

interface TemplateBarProps {
  templateNames: Record<string, string>
  onRefreshTemplates: () => void
  initialTemplate?: TemplateItemData | null
  onApplyTemplate?: () => void
}

export function TemplateBar({
  templateNames,
  onRefreshTemplates,
  initialTemplate,
  onApplyTemplate,
}: TemplateBarProps) {
  const activeTemplateId = useRenderSettingsStore((s) => s.activeTemplateId)
  const draftConfig = useDraftStore((s) => s.config)

  const [templateOpen, setTemplateOpen] = useState(false)

  const displayTemplateId = draftConfig?.activeTemplateId ?? activeTemplateId
  const isDirty = draftConfig
    ? draftConfig.activeTemplateId === null
    : activeTemplateId === null

  const buttonLabel = isDirty
    ? "视频模板: 未保存"
    : `视频模板: ${templateNames[displayTemplateId ?? ""] ?? "默认"}`

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setTemplateOpen(true)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted-foreground/20",
          isDirty && "text-brand"
        )}
        aria-label={isDirty ? "另存为模板" : "模板配置"}
      >
        <Settings2Icon className="size-4 shrink-0" />
        <span>{buttonLabel}</span>
      </button>

      <TemplatePanel
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        onRefreshTemplates={onRefreshTemplates}
        initialTemplate={initialTemplate}
        onApplyTemplate={onApplyTemplate}
      />
    </div>
  )
}
