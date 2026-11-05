import { Img, useVideoConfig } from "remotion"

import type { WatermarkSettings } from "../utils/types"

const MAX_WIDTH_RATIO = 0.25
const MAX_HEIGHT_RATIO = 0.12
const MARGIN_RATIO = 0.03
const OPACITY = 0.3

function isUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function parseWatermark(value: string): WatermarkSettings {
  if (!value) return { type: "text", value: "" }
  if (isUrl(value)) return { type: "image", value }
  return { type: "text", value }
}

interface WatermarkProps {
  watermark: string
}

export function Watermark({ watermark }: WatermarkProps) {
  const { width, height } = useVideoConfig()

  if (!watermark) return null

  const settings = parseWatermark(watermark)
  const maxWidth = width * MAX_WIDTH_RATIO
  const maxHeight = height * MAX_HEIGHT_RATIO
  const marginX = width * MARGIN_RATIO
  const marginY = height * MARGIN_RATIO

  return (
    <div
      style={{
        position: "absolute",
        top: marginY,
        right: marginX,
        maxWidth,
        maxHeight,
        opacity: OPACITY,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {settings.type === "image" ? (
        <Img
          src={settings.value}
          style={{
            maxWidth,
            maxHeight,
            objectFit: "contain",
          }}
        />
      ) : (
        <span
          style={{
            fontSize: maxHeight * 0.65,
            color: "#ffffff",
            whiteSpace: "nowrap",
            lineHeight: 1.1,
          }}
        >
          {settings.value}
        </span>
      )}
    </div>
  )
}
