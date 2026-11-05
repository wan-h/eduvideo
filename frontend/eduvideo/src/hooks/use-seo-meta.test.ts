/** @vitest-environment happy-dom */

import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { useSeoMeta } from "./use-seo-meta"

describe("useSeoMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.title = ""
  })

  it("sets document.title on mount", () => {
    const previousTitle = document.title

    renderHook(() => useSeoMeta({ title: "Test Title" }))

    expect(document.title).toBe("Test Title")
    expect(document.title).not.toBe(previousTitle)
  })

  it("creates meta tags on mount", () => {
    renderHook(() =>
      useSeoMeta({
        meta: [{ key: "description", attr: "name", value: "A test page" }],
      })
    )

    const meta = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]'
    )
    expect(meta).not.toBeNull()
    expect(meta!.getAttribute("content")).toBe("A test page")
  })

  it("injects JSON-LD script elements on mount", () => {
    const data = { "@context": "https://schema.org", "@type": "WebSite" }

    renderHook(() => useSeoMeta({ structuredData: [data] }))

    const scripts = document.head.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]'
    )
    expect(scripts.length).toBe(1)
    expect(JSON.parse(scripts[0]!.text)).toEqual(data)
  })

  it("sets canonical link on mount", () => {
    renderHook(() => useSeoMeta({ canonicalUrl: "https://example.com/page" }))

    const link = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]'
    )
    expect(link).not.toBeNull()
    expect(link!.getAttribute("href")).toBe("https://example.com/page")
  })

  it("restores previous title on unmount", () => {
    const originalTitle = "Original Title"
    document.title = originalTitle

    const { unmount } = renderHook(() => useSeoMeta({ title: "New Title" }))

    expect(document.title).toBe("New Title")

    unmount()

    expect(document.title).toBe(originalTitle)
  })

  it("restores previous meta and removes injected scripts on unmount", () => {
    // Set up a pre-existing meta tag
    const existingMeta = document.createElement("meta")
    existingMeta.setAttribute("name", "description")
    existingMeta.setAttribute("content", "old desc")
    document.head.appendChild(existingMeta)

    const { unmount } = renderHook(() =>
      useSeoMeta({
        meta: [{ key: "description", attr: "name", value: "new desc" }],
        structuredData: [{ "@type": "WebSite" }],
      })
    )

    // Verify new values are set
    expect(
      document.head
        .querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.getAttribute("content")
    ).toBe("new desc")

    unmount()

    // Meta should be restored to old value
    expect(
      document.head
        .querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.getAttribute("content")
    ).toBe("old desc")

    // Injected scripts should be removed
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
    ).toBeNull()

    // Cleanup
    existingMeta.remove()
  })
})
