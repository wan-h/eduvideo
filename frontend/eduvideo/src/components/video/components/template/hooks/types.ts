import type { VideoConfigFields } from "@/store/render-settings-store"

export interface TemplateItemData {
  id: string
  name: string
  config: VideoConfigFields
  isDefault: boolean
}
