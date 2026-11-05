import { ErrorBoundaryFallback } from "@/components/error/error-boundary-fallback"
import { ErrorBoundary } from "react-error-boundary"
import { Outlet } from "react-router"

import { StudioBackground } from "./components/studio-background"

export function StudioLayout() {
  return (
    <div className="relative flex h-screen flex-col">
      <StudioBackground />
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorBoundaryFallback error={error} onReset={resetErrorBoundary} />
        )}
      >
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
