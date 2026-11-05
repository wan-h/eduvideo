import { loadFont } from "@remotion/fonts"
import { continueRender, delayRender, staticFile } from "remotion"

let fontsLoaded = false

export function useLoadFonts() {
  if (fontsLoaded) return
  fontsLoaded = true

  const handle = delayRender("Loading Noto Sans SC fonts")

  Promise.allSettled([
    loadFont({
      family: "Noto Sans SC",
      url: staticFile("fonts/noto-sans-sc-chinese-simplified-400-normal.woff2"),
      weight: "400",
      format: "woff2",
    }),
    loadFont({
      family: "Noto Sans SC",
      url: staticFile("fonts/noto-sans-sc-chinese-simplified-700-normal.woff2"),
      weight: "700",
      format: "woff2",
    }),
  ]).finally(() => {
    continueRender(handle)
  })
}

/** Remotion 端统一字体链：Noto Sans SC 本地字体为首选，确保客户端预览与服务端渲染完全一致 */
export const PRIMARY_FONT_FAMILY = `'Noto Sans SC', 'PingFang SC', 'PingFang HK', 'PingFang TC', 'Heiti SC', 'Heiti TC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei', sans-serif`
