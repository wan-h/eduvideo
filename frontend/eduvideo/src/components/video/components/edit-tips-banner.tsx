"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/i18n/language-provider"
import { cn } from "@/utils/cn"
import { Lightbulb, Sparkles, XIcon } from "lucide-react"

import type { EditTips } from "@/api/eduai/tts.types"

interface EditTipsBannerProps {
  tips: EditTips
  onDismiss: () => void
  className?: string
}

/**
 * 编辑小技巧 banner — brand 淡色背景，展示在字幕列表顶部。
 *
 * 仅数据就绪时渲染，加载中/错误由父组件控制不展示。
 * 右上角 × 按钮关闭（持久化到 localStorage）。
 */
export function EditTipsBanner({
  tips,
  onDismiss,
  className,
}: EditTipsBannerProps) {
  const { translate } = useLanguage()

  return (
    <div className={cn("relative rounded-lg bg-brand/15 p-3", className)}>
      {/* ── 标题栏 ── */}
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="size-3.5 shrink-0 text-brand" />
        <span className="flex-1 text-xs font-medium text-brand">
          {translate("编辑小技巧")}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-5 text-muted-foreground hover:bg-brand/20 hover:text-foreground"
          aria-label={translate("关闭编辑小技巧")}
          onClick={onDismiss}
        >
          <XIcon className="size-3" />
        </Button>
      </div>

      {/* ── 内容区 ── */}
      <ul className="space-y-1">
        {tips.map((tip, index) => (
          <li
            key={index}
            className="flex items-start gap-1.5 text-xs text-foreground/80"
          >
            <Sparkles className="mt-[3px] size-3 shrink-0 text-brand/70" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
