import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/utils/cn"
import { PanelLeftOpen, PanelRightOpen } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { Layout, PanelImperativeHandle } from "react-resizable-panels"

const STORAGE_KEY_LEFT_COLLAPSED = "share:sidebar:leftCollapsed"
const STORAGE_KEY_RIGHT_COLLAPSED = "share:sidebar:rightCollapsed"
const STORAGE_KEY_LAYOUT = "a2v:v1:share:sidebar:layout"

function readPersistedLayout(): Layout | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAYOUT)
    if (raw) return JSON.parse(raw) as Layout
  } catch {
    // quota exceeded / disabled
  }
  return undefined
}

function persistLayout(layout: Layout) {
  try {
    localStorage.setItem(STORAGE_KEY_LAYOUT, JSON.stringify(layout))
  } catch {
    // quota exceeded / disabled
  }
}

const CollapseLeftContext = createContext<() => void>(() => {})
const CollapseRightContext = createContext<() => void>(() => {})

export function useCollapseLeft() {
  return useContext(CollapseLeftContext)
}

export function useCollapseRight() {
  return useContext(CollapseRightContext)
}

interface ShareLayoutProps {
  leftSidebar: ReactNode
  content: ReactNode
  rightSidebar: ReactNode
}

export function ShareLayout({
  leftSidebar,
  content,
  rightSidebar,
}: ShareLayoutProps) {
  const [isLeftCollapsed, setIsLeftCollapsed] = useLocalStorage(
    STORAGE_KEY_LEFT_COLLAPSED,
    "false"
  )
  const [isRightCollapsed, setIsRightCollapsed] = useLocalStorage(
    STORAGE_KEY_RIGHT_COLLAPSED,
    "false"
  )
  const [defaultLayout] = useState(() => readPersistedLayout())

  const leftCollapsed = isLeftCollapsed === "true"
  const rightCollapsed = isRightCollapsed === "true"

  const leftPanelRef = useRef<PanelImperativeHandle>(null)
  const rightPanelRef = useRef<PanelImperativeHandle>(null)

  const handleLeftResize = useCallback(
    (size: { asPercentage: number; inPixels: number }) => {
      setIsLeftCollapsed(size.asPercentage === 0 ? "true" : "false")
    },
    [setIsLeftCollapsed]
  )
  const handleRightResize = useCallback(
    (size: { asPercentage: number; inPixels: number }) => {
      setIsRightCollapsed(size.asPercentage === 0 ? "true" : "false")
    },
    [setIsRightCollapsed]
  )

  const handleLayoutChanged = useCallback((layout: Layout) => {
    persistLayout(layout)
  }, [])

  const collapseLeft = useCallback(() => {
    leftPanelRef.current?.collapse()
  }, [])
  const expandLeft = useCallback(() => {
    leftPanelRef.current?.expand()
  }, [])
  const collapseRight = useCallback(() => {
    rightPanelRef.current?.collapse()
  }, [])
  const expandRight = useCallback(() => {
    rightPanelRef.current?.expand()
  }, [])

  return (
    <div className="flex h-full">
      {leftCollapsed && (
        <div
          className={cn(
            "flex shrink-0 flex-col items-center bg-muted/30 pt-2",
            "w-10"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={expandLeft}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={4}>
              历史会话
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      <ResizablePanelGroup
        orientation="horizontal"
        className="flex-1"
        defaultLayout={defaultLayout}
        onLayoutChanged={handleLayoutChanged}
      >
        <ResizablePanel
          id="left"
          defaultSize={18}
          minSize={"14%"}
          maxSize={"20%"}
          collapsible
          collapsedSize={0}
          onResize={handleLeftResize}
          panelRef={leftPanelRef}
        >
          <CollapseLeftContext.Provider value={collapseLeft}>
            {leftSidebar}
          </CollapseLeftContext.Provider>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel id="center" maxSize={"100%"}>
          {content}
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          id="right"
          defaultSize={"30%"}
          minSize={"14%"}
          maxSize={"45%"}
          collapsible
          collapsedSize={0}
          onResize={handleRightResize}
          panelRef={rightPanelRef}
        >
          <CollapseRightContext.Provider value={collapseRight}>
            {rightSidebar}
          </CollapseRightContext.Provider>
        </ResizablePanel>
      </ResizablePanelGroup>

      {rightCollapsed && (
        <div
          className={cn(
            "flex shrink-0 flex-col items-center bg-muted/30 pt-2",
            "w-10"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={expandRight}
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={4}>
              对话面板
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
