import { AppHeader } from "@/components/app-header"
import { ErrorBoundaryFallback } from "@/components/error/error-boundary-fallback"
import {
  NOTICE_BANNER_HEIGHT,
  NoticeBanner,
} from "@/components/home/notice-banner"
import { useHomeDisplayInfo } from "@/hooks/use-home-display-info"
import { useSessionStorage } from "@/hooks/use-session-storage"
import { ErrorBoundary } from "react-error-boundary"
import { Outlet } from "react-router"

export function PublicLayout() {
  const { data } = useHomeDisplayInfo()
  const [dismissed, setDismissed] = useSessionStorage(
    "notice-banner-dismissed",
    "false"
  )

  const isDismissed = dismissed === "true"
  const hasBanner =
    data && data.notifications && data.notifications.length > 0 && !isDismissed

  const headerTop = hasBanner ? NOTICE_BANNER_HEIGHT : 0
  // AppHeader expanded h-16 = 64px
  const contentPaddingTop = headerTop + 64

  return (
    <div className="flex min-h-screen flex-col">
      <NoticeBanner
        dismissed={isDismissed}
        onDismiss={() => setDismissed("true")}
      />
      <AppHeader variant="expanded" topOffset={headerTop} />
      <div
        className="flex flex-1 flex-col"
        style={{ paddingTop: contentPaddingTop }}
      >
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorBoundaryFallback error={error} onReset={resetErrorBoundary} />
          )}
        >
          <Outlet />
        </ErrorBoundary>
      </div>
    </div>
  )
}
