"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLanguage } from "@/i18n/language-provider"
import { Lightbulb } from "lucide-react"

interface EditTipsToggleButtonProps {
  onClick: () => void
}

/**
 * 编辑小技巧切换按钮 — 当 banner 被关闭后，显示在"字幕"标题右侧。
 *
 * hover 显示 "查看编辑小技巧"，点击重新打开 banner。
 */
export function EditTipsToggleButton({ onClick }: EditTipsToggleButtonProps) {
  const { translate } = useLanguage()

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="size-5 text-muted-foreground hover:text-foreground"
          aria-label={translate("查看编辑小技巧")}
          onClick={onClick}
        >
          <Lightbulb className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{translate("查看编辑小技巧")}</p>
      </TooltipContent>
    </Tooltip>
  )
}
