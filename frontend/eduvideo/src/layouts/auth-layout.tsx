import { ErrorBoundaryFallback } from "@/components/error/error-boundary-fallback"
import { ErrorBoundary } from "react-error-boundary"
import { Outlet } from "react-router"

export function AuthLayout() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorBoundaryFallback error={error} onReset={resetErrorBoundary} />
      )}
    >
      <Outlet />
    </ErrorBoundary>
  )
}