import { Button } from "@/components/ui/button"
import { PanelRightClose } from "lucide-react"
import { useCollapseRight } from "./share-layout"

export function CollapseButton() {
  const collapseRight = useCollapseRight()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={collapseRight}
      title="收起面板"
    >
      <PanelRightClose className="h-4 w-4" />
    </Button>
  )
}
