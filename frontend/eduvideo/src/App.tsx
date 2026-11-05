import { ErrorBoundaryFallback } from "@/components/error/error-boundary-fallback"
import { QueryClientProvider } from "@tanstack/react-query"
import { ErrorBoundary } from "react-error-boundary"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"
import { TooltipProvider } from "./components/ui/tooltip"
import { routeConfig } from "./routes/route.config"
import { queryClient } from "./services/query-client"

const router = createBrowserRouter(routeConfig)

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorBoundaryFallback error={error} onReset={resetErrorBoundary} />
          )}
        >
          <RouterProvider router={router} />
        </ErrorBoundary>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App