"use client"

import { XIcon } from "lucide-react"

import { TipsCarousel } from "@/components/ui/tips-carousel"
import { useHomeDisplayInfo } from "@/hooks/use-home-display-info"
import { cn } from "@/utils/cn"

/** 通知 banner 固定高度，用于 header/content 偏移计算 */
export const NOTICE_BANNER_HEIGHT = 36

interface NoticeBannerProps {
  dismissed: boolean
  onDismiss: () => void
}

/**
 * 首页通知 banner。
 *
 * - 固定在页面最顶部（AppHeader 上方），z-50
 * - 多条通知轮播展示
 * - dismissed/onDismiss 由父组件（PublicLayout）管理，sessionStorage 持久化
 */
export function NoticeBanner({ dismissed, onDismiss }: NoticeBannerProps) {
  const { data, isLoading } = useHomeDisplayInfo()

  if (isLoading || !data) return null
  if (dismissed) return null

  const notifications = data.notifications
  if (!notifications || notifications.length === 0) return null

  return (
    <div
      className={cn(
        "fixed top-0 right-0 left-0 z-50 flex items-center justify-center",
        "bg-brand/10 px-4 backdrop-blur-xl backdrop-saturate-150",
        "border-b border-brand/20"
      )}
      style={{ height: NOTICE_BANNER_HEIGHT }}
    >
      <TipsCarousel items={notifications} className="text-brand" />

      <button
        type="button"
        className="absolute right-4 flex size-5 shrink-0 items-center justify-center rounded-full text-brand/60 transition-colors hover:bg-brand/20 hover:text-brand"
        aria-label="关闭通知"
        onClick={onDismiss}
      >
        <XIcon className="size-3" />
      </button>
    </div>
  )
}
