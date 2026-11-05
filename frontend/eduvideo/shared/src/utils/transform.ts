import { v7 as uuidv7 } from "uuid"

import { ZERO_WIDTH_PATTERN } from "./regexp"
import type { FeSegment, FeSubtitle, FeVideoData } from "./schemas"
import type { RawSegment, RawSubtitle, RawVideoData } from "./types"

// ============================================================
// 内部工具函数
// ============================================================

function withSubtitleIds(subtitles: RawSubtitle[]): FeSubtitle[] {
  return subtitles.map((sub) => ({
    id: uuidv7(),
    text: sub.text,
    audio: sub.audio,
    duration: sub.duration,
  }))
}

function stripSubtitleIds(subtitles: FeSubtitle[]): RawSubtitle[] {
  return subtitles.map(({ text, audio, duration }) => ({
    text,
    audio,
    duration,
  }))
}

function rawSegmentToFeSegment(seg: RawSegment): FeSegment {
  return {
    id: uuidv7(),
    title: seg.title,
    content: seg.content,
    subtitles: withSubtitleIds(seg.subtitles),
  }
}

// ============================================================
// 正向转换：后端数据 → 前端展示结构
// ============================================================

/**
 * 将后端原始数据转换为前端结构。
 *
 * - question_metadata → questionMetadata（camelCase）
 * - question_content  → questionContent（camelCase）
 * - scenes 对象 → scenes 数组（保持 3 个 scene，每个内部以 segments 数组组织）
 * - question_introduction 的 stem/options/subtitles 包装为 segments[0]
 * - 每个 scene、segment、subtitle 获得前端维护的唯一 id
 */
export function dataToFe(raw: RawVideoData): FeVideoData {
  const { scenes } = raw
  const {
    question_introduction: intro,
    question_solution: solution,
    question_key_points: keyPoints,
  } = scenes

  return {
    questionMetadata: { ...raw.question_metadata },
    questionContent: { ...raw.question_content },
    scenes: [
      {
        id: uuidv7(),
        sceneType: "question_introduction",
        segments: [
          {
            id: uuidv7(),
            title: "",
            content: intro.stem,
            options: intro.options.filter(
              (o) => o.replace(ZERO_WIDTH_PATTERN, "").trim() !== ""
            ),
            subtitles: withSubtitleIds(intro.subtitles),
          },
        ],
      },
      {
        id: uuidv7(),
        sceneType: "question_solution",
        segments: solution.segments.map(rawSegmentToFeSegment),
      },
      {
        id: uuidv7(),
        sceneType: "question_key_points",
        segments: keyPoints.segments.map(rawSegmentToFeSegment),
      },
    ],
  }
}

// ============================================================
// 逆向转换：前端展示结构 → 后端原始数据
// ============================================================

/**
 * 将前端结构逆向还原为后端原始数据格式。
 *
 * - questionMetadata → question_metadata
 * - questionContent  → question_content
 * - scenes 数组 → scenes 对象（按 sceneType 还原，去掉所有 id）
 * - question_introduction 的 segments[0].content → stem
 */
export function feToData(fe: FeVideoData): RawVideoData {
  const introScene = fe.scenes.find(
    (s) => s.sceneType === "question_introduction"
  )
  const solutionScene = fe.scenes.find(
    (s) => s.sceneType === "question_solution"
  )
  const keyPointsScene = fe.scenes.find(
    (s) => s.sceneType === "question_key_points"
  )

  if (!introScene || !solutionScene || !keyPointsScene) {
    throw new Error("缺少必要的 scene，无法完成逆向转换")
  }

  const introSeg = introScene.segments[0]
  if (!introSeg) {
    throw new Error("question_introduction 缺少 segment，无法完成逆向转换")
  }

  return {
    question_metadata: { ...fe.questionMetadata },
    question_content: { ...fe.questionContent },
    scenes: {
      question_introduction: {
        stem: introSeg.content,
        options: introSeg.options ?? [],
        subtitles: stripSubtitleIds(introSeg.subtitles),
      },
      question_solution: {
        segments: solutionScene.segments.map(
          ({ title, content, subtitles }) => ({
            title,
            content,
            subtitles: stripSubtitleIds(subtitles),
          })
        ),
      },
      question_key_points: {
        segments: keyPointsScene.segments.map(
          ({ title, content, subtitles }) => ({
            title,
            content,
            subtitles: stripSubtitleIds(subtitles),
          })
        ),
      },
    },
  }
}
