import { isEmpty } from "lodash-es"
import { useMemo } from "react"
import { useCurrentFrame } from "remotion"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import type { SubtitleItem } from "../hooks/use-scene-timeline"
import { THEME } from "../styles/theme"

export interface SubtitlesProps {
  subtitleItems: SubtitleItem[]
}

export function Subtitles({ subtitleItems }: SubtitlesProps) {
  const frame = useCurrentFrame()
  const scale = useResolutionScale()

  const currentSubtitle = useMemo(
    () => subtitleItems.find((s) => frame >= s.start && frame <= s.end),
    [frame, subtitleItems]
  )

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: `0 ${40 * scale}px ${20 * scale}px`,
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      {!isEmpty(currentSubtitle) && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.60)",
            color: THEME.colors.pureWhite,
            textShadow: THEME.textShadow.chalk,
            padding: `${20 * scale}px ${36 * scale}px`,
            borderRadius: 12 * scale,
            textAlign: "center",
            fontSize: 32 * scale,
            lineHeight: 1.2,
          }}
        >
          {currentSubtitle.text}
        </div>
      )}
    </div>
  )
}
