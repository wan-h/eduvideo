import type { BackgroundType, Resolution } from "@ask2vid/shared"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { BackgroundSection } from "./background-section"
import { FilmRow } from "./film-row"
import { WatermarkRow } from "./watermark-row"

const RESOLUTION_OPTIONS: Resolution[] = ["720p", "1080p", "2K"]

const FPS_OPTIONS = [
  { label: "15 FPS", value: "15" },
  { label: "24 FPS", value: "24" },
  { label: "30 FPS", value: "30" },
  { label: "60 FPS", value: "60" },
] as const

export const PAGE_LAYOUT_OPTIONS = [
  { label: "题目左分屏", value: "question_split" },
  { label: "全屏讲解", value: "full_screen" },
] as const

interface ConfigEditorProps {
  currentSettings: {
    fps: number
    resolution: Resolution
    opening_film: string
    closing_film: string
    watermark: string
    background: BackgroundType | string
    page_layout: string
  }
  setFps: (v: number) => void
  setResolution: (v: Resolution) => void
  setOpeningFilm: (v: string) => void
  setClosingFilm: (v: string) => void
  setWatermark: (v: string) => void
  setBackground: (v: BackgroundType | string) => void
  setPageLayout: (v: string) => void
}

export function ConfigEditor({
  currentSettings,
  setFps,
  setResolution,
  setOpeningFilm,
  setClosingFilm,
  setWatermark,
  setBackground,
  setPageLayout,
}: ConfigEditorProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">FPS</span>
          <Select
            value={String(currentSettings.fps)}
            onValueChange={(v) => setFps(Number(v))}
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FPS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">分辨率</span>
          <Select
            value={currentSettings.resolution}
            onValueChange={(v) => setResolution(v as Resolution)}
          >
            <SelectTrigger className="h-7 w-auto min-w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">页面布局</span>
          <Select
            value={currentSettings.page_layout}
            onValueChange={(v) => setPageLayout(v)}
          >
            <SelectTrigger className="h-7 w-auto min-w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_LAYOUT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <FilmRow
        label="片头"
        value={currentSettings.opening_film}
        onChange={setOpeningFilm}
      />

      <FilmRow
        label="片尾"
        value={currentSettings.closing_film}
        onChange={setClosingFilm}
      />

      <Separator />

      <WatermarkRow value={currentSettings.watermark} onChange={setWatermark} />

      <Separator />

      <BackgroundSection
        current={currentSettings.background}
        onSelect={setBackground}
      />
    </div>
  )
}
