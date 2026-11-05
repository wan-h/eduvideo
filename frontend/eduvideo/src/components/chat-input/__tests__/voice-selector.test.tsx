/** @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LanguageProvider, useLanguage } from "@/i18n/language-provider"

import { VoiceSelector } from "../voice-selector"

/**
 * LIT-497-3 回归测试：覆盖 `VoiceSelector` 在 zh-CN / en 两种语言下
 * 触发按钮文案（triggerLabel）按 `voiceLabelByType` 选边。
 *
 * 关键约束（来自父 issue 风险/注意）：
 * - 不要 mock 整个 `language-provider`——这里直接套真实 `LanguageProvider`，
 *   这样才能端到端验证 translate 行为。
 * - 只 mock 业务 API（`listSupportedVoices` / `listClonedVoices`）。
 */

const mockListSupportedVoices = vi.fn()
const mockListClonedVoices = vi.fn()

vi.mock("@/api/eduai/tts", () => ({
  listSupportedVoices: () => mockListSupportedVoices(),
  listClonedVoices: () => mockListClonedVoices(),
}))

/**
 * 包装一层：把 `toggleLanguage` 暴露为按钮，方便测试切语言。
 * `LanguageProvider` 自带 `translate`，所以这里不需要再传。
 */
function Harness({
  value,
  onChange,
}: {
  value: string
  onChange: (voiceId: string) => void
}) {
  const { toggleLanguage, language } = useLanguage()
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      {/* 用 "语言切换" 这个已在 zhToEn 里的 key，确保 en 模式下可被自动翻译 */}
      <button onClick={toggleLanguage} type="button">
        语言切换
      </button>
      <VoiceSelector value={value} onChange={onChange} language="chinese" />
    </div>
  )
}

function renderVoiceSelector(value: string) {
  const onChange = vi.fn()
  const utils = render(
    <LanguageProvider>
      <Harness value={value} onChange={onChange} />
    </LanguageProvider>
  )
  return { ...utils, onChange }
}

describe("VoiceSelector (LIT-497-3 回归)", () => {
  beforeEach(() => {
    mockListSupportedVoices.mockReset()
    mockListClonedVoices.mockReset()
    // 清掉 localStorage，避免上一个用例残留
    window.localStorage.clear()
    document.documentElement.lang = ""

    mockListSupportedVoices.mockResolvedValue([
      {
        voice: "zh_female_putonghua",
        label: "普通话女声",
        url: "https://example.com/zh_female_putonghua.mp3",
        language: "chinese" as const,
      },
    ])
    mockListClonedVoices.mockResolvedValue([])
  })

  it("初始 zh-CN：trigger 显示原始中文 label", async () => {
    renderVoiceSelector("zh_female_putonghua")

    await waitFor(() => {
      // 列表项也会渲染，但 trigger 是第一个匹配
      const buttons = screen.getAllByText("普通话女声")
      expect(buttons.length).toBeGreaterThan(0)
    })
    expect(screen.getByTestId("current-language").textContent).toBe("zh-CN")
  })

  it("切换到 en 后：重新加载后端返回的英文 label 'Mandarin female'", async () => {
    mockListSupportedVoices
      .mockResolvedValueOnce([
        {
          voice: "zh_female_putonghua",
          label: "普通话女声",
          url: "https://example.com/zh_female_putonghua.mp3",
          language: "chinese" as const,
        },
      ])
      .mockResolvedValueOnce([
        {
          voice: "zh_female_putonghua",
          label: "Mandarin female",
          url: "https://example.com/zh_female_putonghua.mp3",
          language: "chinese" as const,
        },
      ])

    renderVoiceSelector("zh_female_putonghua")

    // 等待 trigger 先出现中文
    await waitFor(() => {
      expect(screen.getAllByText("普通话女声").length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole("button", { name: "语言切换" }))

    await waitFor(() => {
      expect(screen.getAllByText("Mandarin female").length).toBeGreaterThan(0)
    })
  })

  it("未知 voice_type 时 trigger 降级到原 label（不抛错）", async () => {
    mockListSupportedVoices.mockResolvedValue([
      {
        voice: "some_unknown_voice",
        label: "外星语音色",
        url: "https://example.com/x.mp3",
        language: "chinese" as const,
      },
    ])

    renderVoiceSelector("some_unknown_voice")

    await waitFor(() => {
      expect(screen.getAllByText("外星语音色").length).toBeGreaterThan(0)
    })
  })
})
