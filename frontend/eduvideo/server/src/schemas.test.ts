import { describe, expect, it } from "vitest"
import { CreateRenderRequestSchema, parseRenderPayload } from "./schemas.js"

describe("parseRenderPayload", () => {
  it("returns rawData and renderSettings separately", () => {
    const result = parseRenderPayload({
      script: JSON.stringify({ scenes: { test: true } }),
      path: "ai-teach/a/b/video.mp4",
      export_settings: JSON.stringify({
        width: 1280,
        height: 720,
        fps: 24,
        background: "blackboard2",
      }),
    })
    expect(result.renderSettings).toEqual({
      width: 1280,
      height: 720,
      fps: 24,
      background: "blackboard2",
      opening_film: "",
      closing_film: "",
      watermark: "",
      speed: 1,
      page_layout: "question_split",
    })
    expect(result.rawData).toEqual({ scenes: { test: true } })
    expect(result.objectKey).toBe("ai-teach/a/b/video.mp4")
  })

  it("applies defaults for missing export_settings fields", () => {
    const result = parseRenderPayload({
      script: JSON.stringify({ scenes: {} }),
      path: "x.mp4",
      export_settings: JSON.stringify({}),
    })
    expect(result.renderSettings.width).toBe(1920)
    expect(result.renderSettings.height).toBe(1080)
    expect(result.renderSettings.fps).toBe(24)
    expect(result.renderSettings.background).toBe("default")
  })

  it("throws on invalid JSON in script", () => {
    expect(() => {
      parseRenderPayload({
        script: "not json",
        path: "x.mp4",
        export_settings: "{}",
      })
    }).toThrow(SyntaxError)
  })

  it("throws on invalid export_settings value", () => {
    expect(() => {
      parseRenderPayload({
        script: JSON.stringify({ scenes: {} }),
        path: "x.mp4",
        export_settings: JSON.stringify({ fps: -1 }),
      })
    }).toThrow()
  })
})

describe("CreateRenderRequestSchema", () => {
  it("rejects empty path", () => {
    const r = CreateRenderRequestSchema.safeParse({
      script: "{}",
      path: "",
      export_settings: "{}",
    })
    expect(r.success).toBe(false)
  })
})
