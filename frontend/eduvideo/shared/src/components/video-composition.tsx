import { Audio } from "@remotion/media"
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion"
import type { z } from "zod"

import { SCENE_TYPE_LABELS } from "../configs/scene-type-labels"
import { useLoadFonts } from "../fonts"
import { useSceneTimeline } from "../hooks/use-scene-timeline"
import { COMPOSITION_DEFAULTS, videoCompositionSchema } from "../utils/schemas"
import { Background } from "./background"
import { ContentArea } from "./content-area"
import { Intro } from "./intro"
import { IntroOutroVideo } from "./intro-outro"
import { Keypoints } from "./keypoints"
import { Solution } from "./solution"
import { SolutionSteps } from "./solution-steps"
import { Subtitles } from "./subtitles"
import { TitleBar } from "./title-bar"
import { Watermark } from "./watermark"

import { QuestionContextCard } from "./question-context-card"

export { videoCompositionSchema }

export type VideoCompositionProps = z.infer<typeof videoCompositionSchema>

/** 单条字幕的音频，通过 Sequence 控制播放时机 */
function SubtitleAudio({
  start,
  end,
  audio,
}: {
  start: number
  end: number
  audio: string
}) {
  const duration = end - start
  return (
    <Sequence from={start} durationInFrames={duration}>
      <Audio src={audio} />
    </Sequence>
  )
}

const FADE_DURATION_S = 0.3

export function VideoComposition({
  scenes,
  renderSettings,
}: VideoCompositionProps) {
  useLoadFonts()
  const globalFrame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const resolvedFps = renderSettings?.fps ?? COMPOSITION_DEFAULTS.fps
  const backgroundImage =
    renderSettings?.background ?? COMPOSITION_DEFAULTS.background

  const openingFilm = renderSettings?.opening_film || ""
  const closingFilm = renderSettings?.closing_film || ""
  const introFrames =
    (openingFilm ? renderSettings?.opening_film_duration_frames : undefined) ??
    0
  const outroFrames =
    (closingFilm ? renderSettings?.closing_film_duration_frames : undefined) ??
    0
  const fadeFrames = Math.max(1, Math.floor(FADE_DURATION_S * resolvedFps))

  const { subtitleItems, getActiveScene } = useSceneTimeline(
    scenes,
    resolvedFps
  )

  // 尝试提取题目介绍中的原题题干与选项（用于解题阶段的左侧常驻卡片）
  const introScene = scenes.find((s) => s.sceneType === "question_introduction")
  const introSegment = introScene?.segments[0]
  const questionStem = introSegment?.content || ""
  const questionOptions = introSegment?.options || []

  const pageLayout = renderSettings?.page_layout ?? "question_split"
  const shouldSplit = pageLayout === "question_split" && Boolean(questionStem)

  // 主内容本地帧号 = 全局帧 - 片头偏移
  const localFrame = globalFrame - introFrames
  const active = localFrame >= 0 ? getActiveScene(localFrame) : null
  const sceneLabel = active ? SCENE_TYPE_LABELS[active.scene.sceneType] : ""

  // sceneFrames 来自 useSceneTimeline 的 totalFrames
  const sceneFrames =
    subtitleItems.length > 0 ? subtitleItems[subtitleItems.length - 1].end : 0

  let contentNode: React.ReactNode = null
  let fadeOverlay: React.ReactNode = null

  if (active) {
    const { scene, segmentIndex, sceneStartFrame, sceneEndFrame } = active
    const segment = scene.segments[segmentIndex]

    if (segment) {
      const isFirstScene = scene.id === scenes[0]?.id
      const segLocalFrame = localFrame - sceneStartFrame
      const sceneOpacity = isFirstScene
        ? 1
        : spring({ frame: segLocalFrame, fps, config: { damping: 14 } })
      const sceneTransform = isFirstScene
        ? "none"
        : `translateY(${(1 - sceneOpacity) * 20}px)`

      const animationStyle = {
        opacity: sceneOpacity,
        transform: sceneTransform,
        height: "100%",
      }

      const skipEntrance = isFirstScene

      switch (scene.sceneType) {
        case "question_introduction":
          contentNode = (
            <div style={animationStyle}>
              <Intro
                stem={segment.content}
                options={segment.options ?? []}
                startFrame={sceneStartFrame}
                durationInFrames={sceneEndFrame - sceneStartFrame}
                skipEntrance={skipEntrance}
              />
            </div>
          )
          break
        case "question_solution": {
          const solutionStepsNode =
            scene.segments.length > 1 ? (
              <SolutionSteps
                segments={scene.segments}
                startFrame={sceneStartFrame}
                skipEntrance={skipEntrance}
                splitLayout={shouldSplit}
              />
            ) : (
              <Solution title={segment.title} content={segment.content} />
            )

          contentNode = shouldSplit ? (
            <div
              style={{
                ...animationStyle,
                display: "flex",
                flexDirection: "row",
                width: "100%",
                gap: "3%",
              }}
            >
              <div style={{ width: "32%", height: "100%" }}>
                <QuestionContextCard
                  stem={questionStem}
                  options={questionOptions}
                  startFrame={sceneStartFrame}
                  durationInFrames={sceneEndFrame - sceneStartFrame}
                />
              </div>
              <div style={{ width: "65%", height: "100%" }}>
                {solutionStepsNode}
              </div>
            </div>
          ) : (
            <div style={animationStyle}>{solutionStepsNode}</div>
          )
          break
        }
        case "question_key_points": {
          const keypointsNode = (
            <Keypoints
              segments={scene.segments}
              startFrame={sceneStartFrame}
              skipEntrance={skipEntrance}
              splitLayout={shouldSplit}
            />
          )

          contentNode = shouldSplit ? (
            <div
              style={{
                ...animationStyle,
                display: "flex",
                flexDirection: "row",
                width: "100%",
                gap: "3%",
              }}
            >
              <div style={{ width: "32%", height: "100%" }}>
                <QuestionContextCard
                  stem={questionStem}
                  options={questionOptions}
                  startFrame={sceneStartFrame}
                  durationInFrames={sceneEndFrame - sceneStartFrame}
                />
              </div>
              <div style={{ width: "65%", height: "100%" }}>
                {keypointsNode}
              </div>
            </div>
          ) : (
            <div style={animationStyle}>{keypointsNode}</div>
          )
          break
        }
      }
    }
  }

  // 主内容 fade in/out（与片头片尾交叠）
  const mainFadeIn = introFrames > 0
  const mainFadeOut = outroFrames > 0
  if (mainFadeIn && localFrame < fadeFrames) {
    fadeOverlay = (
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          opacity: 1 - localFrame / fadeFrames,
        }}
      />
    )
  }
  if (
    mainFadeOut &&
    localFrame >= sceneFrames - fadeFrames &&
    localFrame < sceneFrames
  ) {
    fadeOverlay = (
      <AbsoluteFill
        style={{
          backgroundColor: "black",
          opacity: (localFrame - (sceneFrames - fadeFrames)) / fadeFrames,
        }}
      />
    )
  }

  const mainContent = (
    <Background backgroundImage={backgroundImage}>
      <TitleBar label={sceneLabel} />
      <ContentArea>{contentNode}</ContentArea>
      <Subtitles subtitleItems={subtitleItems} />
      {subtitleItems.map((item, index) =>
        item.audio ? (
          <SubtitleAudio
            key={`${item.start}-${index}`}
            start={item.start}
            end={item.end}
            audio={item.audio}
          />
        ) : null
      )}
      {fadeOverlay}
    </Background>
  )

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* 片头 */}
      {openingFilm && introFrames > 0 && (
        <Sequence from={0} durationInFrames={introFrames + fadeFrames}>
          <IntroOutroVideo
            src={openingFilm}
            position="intro"
            durationInFrames={introFrames + fadeFrames}
            fadeFrames={fadeFrames}
          />
        </Sequence>
      )}

      {/* 主内容 — 从片头结束位置开始 */}
      <Sequence from={introFrames} durationInFrames={sceneFrames}>
        {mainContent}
      </Sequence>

      {/* 片尾 */}
      {closingFilm && outroFrames > 0 && (
        <Sequence
          from={introFrames + sceneFrames}
          durationInFrames={outroFrames + fadeFrames}
        >
          <IntroOutroVideo
            src={closingFilm}
            position="outro"
            durationInFrames={outroFrames + fadeFrames}
            fadeFrames={fadeFrames}
          />
        </Sequence>
      )}

      {/* 水印 — 覆盖全片 */}
      <Watermark watermark={renderSettings?.watermark ?? ""} />
    </AbsoluteFill>
  )
}
