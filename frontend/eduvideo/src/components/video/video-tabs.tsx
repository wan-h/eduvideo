import { SegmentedControl } from "@/components/ui/segmented-control"

export interface VideoTab {
  id: string
  label: string
  durationInFrames: number
}

interface VideoTabsProps {
  tabs: VideoTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

export function VideoTabs({ tabs, activeTabId, onTabChange }: VideoTabsProps) {
  return (
    <div className="flex justify-center pt-6">
      <SegmentedControl
        items={tabs.map((t) => ({ id: t.id, label: t.label }))}
        activeId={activeTabId}
        onChange={onTabChange}
      />
    </div>
  )
}
