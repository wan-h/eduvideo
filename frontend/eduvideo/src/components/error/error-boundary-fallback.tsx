import { ErrorPage } from "@/components/error/error-page"

interface ErrorBoundaryFallbackProps {
  error: unknown
  onReset: () => void
}

export function ErrorBoundaryFallback({
  error,
  onReset,
}: ErrorBoundaryFallbackProps) {
  const message =
    error instanceof Error ? error.message : "发生了未知错误，请稍后重试"

  return <ErrorPage title="加载失败" description={message} onRetry={onReset} />
}