import { describe, expect, it } from "vitest"
import { formatTime, parseTime } from "../time-display"

const fps = 30

describe("parseTime", () => {
  it("parses M:SS.FF format", () => {
    expect(parseTime("1:23.15", fps)).toBe(1 * 60 * 30 + 23 * 30 + 15)
  })

  it("parses M:SS format (no frames)", () => {
    expect(parseTime("0:05", fps)).toBe(5 * 30)
  })

  it("parses H:MM:SS.FF format", () => {
    expect(parseTime("1:02:30.00", fps)).toBe(
      1 * 3600 * 30 + 2 * 60 * 30 + 30 * 30
    )
  })

  it("parses plain seconds", () => {
    expect(parseTime("90", fps)).toBe(90 * 30)
  })

  it("parses decimal seconds", () => {
    expect(parseTime("90.5", fps)).toBe(Math.round(90.5 * 30))
  })

  it("returns null for empty string", () => {
    expect(parseTime("", fps)).toBeNull()
  })

  it("returns null for whitespace only", () => {
    expect(parseTime("   ", fps)).toBeNull()
  })

  it("returns null for invalid format", () => {
    expect(parseTime("abc", fps)).toBeNull()
  })

  it("returns null for negative numbers", () => {
    expect(parseTime("-5", fps)).toBeNull()
  })

  it("returns null for negative minutes", () => {
    expect(parseTime("-1:30.00", fps)).toBeNull()
  })

  it("returns null for frames >= fps", () => {
    expect(parseTime("0:00.99", fps)).toBeNull()
  })

  it("parses single-digit frame in timecode", () => {
    expect(parseTime("0:00.5", fps)).toBe(5)
  })

  it("parses two-digit frame with leading zero", () => {
    expect(parseTime("0:00.05", fps)).toBe(5)
  })

  it("returns null for seconds >= 60", () => {
    expect(parseTime("0:65.00", fps)).toBeNull()
  })
})

describe("formatTime roundtrip", () => {
  it("produces parseable output for non-hour duration", () => {
    const formatted = formatTime(2500, fps)
    const parsed = parseTime(formatted, fps)
    expect(parsed).toBe(2500)
  })

  it("produces parseable output for hour+ duration", () => {
    const formatted = formatTime(150000, fps)
    const parsed = parseTime(formatted, fps)
    expect(parsed).toBe(150000)
  })
})
