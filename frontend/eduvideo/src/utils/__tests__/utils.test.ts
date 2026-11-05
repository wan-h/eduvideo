/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest"
import { cn } from "../cn"
import { AppError, FilmVideoError } from "../errors"
import { resolveApiUrl } from "../api-url"
import { toFormData } from "../form-data"

describe("cn utility", () => {
  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "p-4", "bg-red-500")).toBe("p-4 bg-red-500")
  })

  it("should handle conditional and falsy classes", () => {
    const isPrimary = false
    expect(cn("btn", isPrimary && "btn-primary", undefined, null, "active")).toBe(
      "btn active"
    )
  })
})

describe("errors utility", () => {
  it("AppError should construct with message and optional code", () => {
    const err = new AppError("Something went wrong", 500)
    expect(err.name).toBe("AppError")
    expect(err.message).toBe("Something went wrong")
    expect(err.code).toBe(500)
  })

  it("FilmVideoError should inherit AppError with specific code", () => {
    const err = new FilmVideoError("Invalid format", "format")
    expect(err.name).toBe("FilmVideoError")
    expect(err.message).toBe("Invalid format")
    expect(err.code).toBe("format")
  })
})

describe("api-url utility", () => {
  it("resolveApiUrl should return devProxyPath in DEV mode", () => {
    vi.stubEnv("DEV", true)
    expect(
      resolveApiUrl("/dev-proxy", "https://api.example.com", "v1")
    ).toBe("/dev-proxy")
  })

  it("resolveApiUrl should format base and prefix in PROD mode", () => {
    vi.stubEnv("DEV", false)
    expect(
      resolveApiUrl("/dev-proxy", "https://api.example.com/", "v1")
    ).toBe("https://api.example.com/v1")
  })
})

describe("form-data utility", () => {
  it("toFormData should omit undefined properties and convert object to FormData", () => {
    const data = {
      name: "test",
      count: 42,
      empty: undefined,
    }
    const fd = toFormData(data)
    expect(fd.get("name")).toBe("test")
    expect(fd.get("count")).toBe("42")
    expect(fd.has("empty")).toBe(false)
  })

  it("toFormData should handle File array items", () => {
    const file = new File(["dummy content"], "test.txt", { type: "text/plain" })
    const data = {
      files: [file, "not-a-file"],
    }
    const fd = toFormData(data)
    expect(fd.get("files")).toEqual(file)
  })
})
