import { useEffect, useState } from "react"
import { continueRender, delayRender, staticFile } from "remotion"

import {
  BACKGROUND_IMAGE_MAP,
  DEFAULT_BACKGROUND,
} from "../configs/backgrounds"

export function useAssetsLoaded() {
  const [handle] = useState(() => delayRender("Loading assets..."))

  useEffect(() => {
    // 预加载背景图
    const img = new Image()
    img.src = staticFile(BACKGROUND_IMAGE_MAP[DEFAULT_BACKGROUND])
    const promise = new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => {
        console.warn("[useAssetsLoaded] Failed to preload background image")
        resolve()
      }
    })

    promise.then(() => continueRender(handle))
  }, [handle])
}
