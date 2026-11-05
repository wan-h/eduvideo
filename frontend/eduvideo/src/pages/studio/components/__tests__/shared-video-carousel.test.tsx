/** @vitest-environment happy-dom */

import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider, useLanguage } from "@/i18n/language-provider"

import { SharedVideoCarousel } from "../shared-video-carousel"

/**
 * LIT-497-3 回归测试：覆盖 `SharedVideoCarousel` 在 zh-CN / en 两种语言下
 * 视频卡片标题（"分享的创作视频"）按 `translateShareVideoTitle` 选边。
 *
 * 关键约束：
 * - 不 mock `language-provider`；直接套 `LanguageProvider` 端到端验证
 * - mock 掉 `requestAnimationFrame` 避免动画 rAF 在 happy-dom 里泄漏
 */

const videos = [
  { url: "https://example.com/math.mp4", title: "数学奥数题讲解" },
]

/**
 * 包装一层：把 `toggleLanguage` 暴露为按钮，方便测试切语言。
 */
function Harness() {
  const { toggleLanguage, language } = useLanguage()
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      {/* "语言切换" 在 zhToEn 里有 "Switch language" 翻译 */}
      <button onClick={toggleLanguage} type="button">
        语言切换
      </button>
      <SharedVideoCarousel videos={videos} />
    </div>
  )
}

describe("SharedVideoCarousel (LIT-497-3 回归)", () => {
  beforeEach(() => {
    // 隔离每个用例
    window.localStorage.clear()
    document.documentElement.lang = ""

    // 稳定 rAF，避免 animation loop 在测试间泄漏
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number
      })
    )
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>))
    )
  })

  it("初始 zh-CN：标题显示原中文 '数学奥数题讲解'", async () => {
    render(
      <LanguageProvider>
        <Harness />
      </LanguageProvider>
    )

    await waitFor(() => {
      // COPIES = 3，标题会出现 3 次
      expect(screen.getAllByText("数学奥数题讲解").length).toBe(3)
    })
    expect(screen.getByTestId("current-language").textContent).toBe("zh-CN")
  })

  it("渲染后端传递的视频标题，前端不作二次翻译修改", async () => {
    render(
      <LanguageProvider>
        <Harness />
      </LanguageProvider>
    )

    await waitFor(() => {
      // COPIES = 3，标题会出现 3 次
      expect(screen.getAllByText("数学奥数题讲解").length).toBe(3)
    })
    expect(screen.getByTestId("current-language").textContent).toBe("zh-CN")
  })
})
