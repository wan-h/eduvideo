import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion"

/**
 * 片头/片尾视频组件。
 * 支持 fade out（片头）或 fade in（片尾），通过 position 区分。
 * 在 <Sequence> 内部使用 — 本地帧号从 0 开始。
 */
export function IntroOutroVideo({
  src,
  position,
  durationInFrames,
  fadeFrames,
}: {
  src: string
  position: "intro" | "outro"
  durationInFrames: number
  fadeFrames: number
}) {
  const frame = useCurrentFrame()

  let opacity = 1
  if (position === "intro") {
    // 片头：末尾 fade out
    const fadeStart = durationInFrames - fadeFrames
    if (frame >= fadeStart) {
      opacity = Math.max(0, 1 - (frame - fadeStart) / fadeFrames)
    }
  } else {
    // 片尾：开头 fade in
    if (frame < fadeFrames) {
      opacity = Math.min(1, frame / fadeFrames)
    }
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={src}
        muted={false}
        style={{ width: "100%", height: "100%", objectFit: "fill" }}
      />
    </AbsoluteFill>
  )
}
