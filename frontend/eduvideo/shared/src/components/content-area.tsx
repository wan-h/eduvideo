import type { PropsWithChildren } from "react"

import { useResolutionScale } from "../hooks/use-resolution-scale"
import { THEME } from "../styles/theme"

const CONTENT_PADDING_X = 76.8
const CONTENT_PADDING_BOTTOM = 40

export function ContentArea({ children }: PropsWithChildren) {
  const scale = useResolutionScale()

  return (
    <div
      style={{
        height: THEME.layout.contentHeight,
        padding: `0 ${CONTENT_PADDING_X * scale}px`,
        paddingBottom: CONTENT_PADDING_BOTTOM * scale,
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  )
}
