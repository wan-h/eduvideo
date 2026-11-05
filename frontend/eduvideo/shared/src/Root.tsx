import { Composition, registerRoot } from "remotion"

import type { VideoCompositionProps } from "./components/video-composition"
import {
  VideoComposition,
  videoCompositionSchema,
} from "./components/video-composition"
import { getFilmDuration } from "./utils/film-video"
import { COMPOSITION_DEFAULTS } from "./utils/schemas"

/** 纯函数：根据 scenes 和 fps 计算总帧数 */
function calcSceneFrames(
  scenes: VideoCompositionProps["scenes"],
  fps: number
): number {
  let totalMs = 0
  for (const scene of scenes) {
    for (const segment of scene.segments) {
      for (const sub of segment.subtitles) {
        totalMs += sub.duration
      }
    }
  }
  return Math.max(1, Math.floor((totalMs / 1000) * fps))
}

/**
 * Remotion Root — server 渲染入口点。
 * 通过 inputProps 接收 scenes 和 renderSettings，schema 由 Zod 验证。
 */
export function RemotionRoot() {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      schema={videoCompositionSchema}
      defaultProps={{
        scenes: [],
        renderSettings: COMPOSITION_DEFAULTS,
      }}
      calculateMetadata={async ({ props }) => {
        const rs = { ...COMPOSITION_DEFAULTS, ...props.renderSettings }
        const fps = rs.fps
        const width = rs.width
        const height = rs.height

        const sceneFrames = calcSceneFrames(props.scenes ?? [], fps)

        // 获取片头/片尾视频时长
        const [introResult, outroResult] = await Promise.all([
          rs.opening_film ? getFilmDuration(rs.opening_film, fps) : null,
          rs.closing_film ? getFilmDuration(rs.closing_film, fps) : null,
        ])

        const introFrames = introResult?.durationInFrames ?? 0
        const outroFrames = outroResult?.durationInFrames ?? 0

        return {
          durationInFrames: introFrames + sceneFrames + outroFrames,
          fps,
          width,
          height,
          props: {
            ...props,
            renderSettings: {
              ...rs,
              opening_film_duration_frames: introFrames,
              closing_film_duration_frames: outroFrames,
            },
          },
        }
      }}
    />
  )
}

registerRoot(RemotionRoot)
