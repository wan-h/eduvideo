export {
  createComponents,
  createPreviewComponents,
} from "./markdown/md-components"
export type { StyleConfig } from "./markdown/md-components"
export { MdRenderer } from "./markdown/md-renderer"

export {
  BACKGROUNDS,
  BACKGROUND_IMAGE_MAP,
  DEFAULT_BACKGROUND,
} from "./configs/backgrounds"
export { RESOLUTION_MAP, resolveDimension } from "./configs/resolution"
export type { Resolution } from "./configs/resolution"
export { SCENE_TYPE_LABELS } from "./configs/scene-type-labels"

export { useSceneTimeline } from "./hooks/use-scene-timeline"
export type {
  ActiveSceneInfo,
  SceneTimeline,
  SubtitleItem,
} from "./hooks/use-scene-timeline"
export { useStepScroll } from "./hooks/use-step-scroll"
export type { UseStepScrollParams } from "./hooks/use-step-scroll"
export {
  BLOCK_FORMULA_HEIGHT,
  /** @deprecated 使用 calcInlineFormulaHeightBonus 替代 */
  INLINE_FORMULA_HEIGHT,
  calcInlineFormulaHeightBonus,
  calcMdHeight,
  calcStepOffsets,
  calcTargetScroll,
  countBlockFormulas,
  countImages,
  countInlineFormulas,
  countLines,
} from "./utils/step-scroll"
export type { FormulaComplexity } from "./utils/step-scroll"

export { Background } from "./components/background"
export { Intro } from "./components/intro"
export type { IntroProps } from "./components/intro"
export { QuestionContextCard } from "./components/question-context-card"
export type { QuestionContextCardProps } from "./components/question-context-card"
export { IntroOutroVideo } from "./components/intro-outro"
export { Keypoints } from "./components/keypoints"
export type { KeypointsProps } from "./components/keypoints"
export { Solution } from "./components/solution"
export type { SolutionProps } from "./components/solution"
export { SolutionSteps } from "./components/solution-steps"
export type { SolutionStepsProps } from "./components/solution-steps"
export { Subtitles } from "./components/subtitles"
export type { SubtitlesProps } from "./components/subtitles"
export {
  VideoComposition,
  videoCompositionSchema,
} from "./components/video-composition"
export type { VideoCompositionProps } from "./components/video-composition"
export { Watermark, parseWatermark } from "./components/watermark"

export { RemotionRoot } from "./Root"

export {
  COMPOSITION_DEFAULTS,
  feSceneSchema,
  feSegmentSchema,
  feSubtitleSchema,
  renderSettingsSchema,
  sceneTypeSchema,
} from "./utils/schemas"
export type {
  FeQuestionContent,
  FeQuestionMetadata,
  FeScene,
  FeSegment,
  FeSubtitle,
  FeVideoData,
  PageLayout,
  RenderSettings,
  SceneType,
} from "./utils/schemas"

export { ZERO_WIDTH_PATTERN } from "./utils/regexp"
export { dataToFe, feToData } from "./utils/transform"
export {
  rawIntroSceneSchema,
  rawQuestionContentSchema,
  rawQuestionMetadataSchema,
  rawScenesSchema,
  rawSegmentSceneSchema,
  rawSegmentSchema,
  rawSubtitleSchema,
  rawVideoDataSchema,
} from "./utils/types"
export type {
  BackgroundType,
  RawIntroScene,
  RawQuestionContent,
  RawQuestionMetadata,
  RawScenes,
  RawSegment,
  RawSegmentScene,
  RawSubtitle,
  RawVideoData,
  WatermarkSettings,
} from "./utils/types"

export { ContentArea } from "./components/content-area"
export { TitleBar } from "./components/title-bar"
export { PRIMARY_FONT_FAMILY, useLoadFonts } from "./fonts"
export { useAssetsLoaded } from "./hooks/use-assets-loaded"
export { useResolutionScale } from "./hooks/use-resolution-scale"
export { THEME } from "./styles/theme"
