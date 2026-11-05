import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { useNavigate } from "react-router"

interface ErrorPageProps {
  title?: string
  description?: string
  onRetry?: () => void
  onBack?: () => void
}

export function ErrorPage({
  title = "加载失败",
  description = "服务器发生错误，请稍后重试",
  onRetry,
  onBack,
}: ErrorPageProps) {
  const navigate = useNavigate()

  // 按钮区域：根据传入的回调决定显示哪些按钮
  const primaryAction = onRetry
  const primaryLabel = "重试"

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex w-full gap-3 pt-1">
            <Button
              variant="outline"
              size="lg"
              className={primaryAction ? "flex-1" : "w-full"}
              onClick={onBack ?? (() => navigate("/"))}
            >
              回到首页
            </Button>
            {primaryAction && (
              <Button
                variant="brand"
                size="lg"
                className="flex-1"
                onClick={primaryAction}
              >
                {primaryLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
