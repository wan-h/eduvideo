import type { PropsWithChildren } from "react"
import { AbsoluteFill, Img, staticFile } from "remotion"

import {
  BACKGROUND_IMAGE_MAP,
  DEFAULT_BACKGROUND,
} from "../configs/backgrounds"
import { useAssetsLoaded } from "../hooks/use-assets-loaded"
import { THEME } from "../styles/theme"
import type { BackgroundType } from "../utils/types"

interface BackgroundProps extends PropsWithChildren {
  backgroundImage?: BackgroundType | string
}

function isPresetKey(value: string): value is BackgroundType {
  return value in BACKGROUND_IMAGE_MAP
}

export function Background({
  children,
  backgroundImage = DEFAULT_BACKGROUND,
}: BackgroundProps) {
  useAssetsLoaded()

  const src = isPresetKey(backgroundImage)
    ? staticFile(BACKGROUND_IMAGE_MAP[backgroundImage])
    : backgroundImage

  return (
    <AbsoluteFill
      style={{
        fontFamily: THEME.fontFamily,
        color: THEME.colors.chalkWhite,
      }}
    >
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {children}
    </AbsoluteFill>
  )
}
