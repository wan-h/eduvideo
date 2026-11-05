export {
  rawIntroSceneSchema,
  rawQuestionContentSchema,
  rawQuestionMetadataSchema,
  rawScenesSchema,
  rawSegmentSceneSchema,
  rawSegmentSchema,
  rawSubtitleSchema,
  rawVideoDataSchema,
} from "./types"
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
} from "./types"

export {
  COMPOSITION_DEFAULTS,
  feSceneSchema,
  feSegmentSchema,
  feSubtitleSchema,
  renderSettingsSchema,
  sceneTypeSchema,
  videoCompositionSchema,
} from "./schemas"
export type {
  FeQuestionContent,
  FeQuestionMetadata,
  FeScene,
  FeSegment,
  FeSubtitle,
  FeVideoData,
  RenderSettings,
  SceneType,
  VideoCompositionProps,
} from "./schemas"

export { ZERO_WIDTH_PATTERN } from "./regexp"
export {
  BLOCK_FORMULA_HEIGHT,
  INLINE_FORMULA_HEIGHT,
  calcInlineFormulaHeightBonus,
  calcMdHeight,
  calcStepOffsets,
  calcTargetScroll,
  countBlockFormulas,
  countImages,
  countInlineFormulas,
  countLines,
} from "./step-scroll"
export type { FormulaComplexity } from "./step-scroll"
export { dataToFe, feToData } from "./transform"
