import { LanguageProvider, useLanguage } from "@/i18n/language-provider"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { beforeEach, describe, expect, it } from "vitest"

function TestContent() {
  const { toggleLanguage } = useLanguage()
  const [showDynamicText, setShowDynamicText] = useState(false)
  const [showDynamicAria, setShowDynamicAria] = useState(false)

  return (
    <div>
      <button onClick={toggleLanguage}>语言切换</button>
      <button onClick={() => setShowDynamicText(true)}>添加</button>
      <button onClick={() => setShowDynamicAria(true)}>添加 aria</button>
      <span>价格</span>
      <span>最近任务</span>
      <input aria-label="用户名" placeholder="输入消息..." />
      <button aria-label="查看更多任务">展开</button>
      <textarea defaultValue="用户输入" placeholder="描述你想要生成的视频..." />
      <span data-no-translate>用户</span>
      <div>
        <span>预置音色</span>
        <span>克隆音色</span>
        <span>创建克隆音色</span>
        <span>音色名称</span>
      </div>
      <a title="点击后在新页面查看完整视频">视频卡片</a>
      <button aria-label="上一条视频">‹</button>
      <button aria-label="下一条视频">›</button>
      {showDynamicText && <span>加载中...</span>}
      {showDynamicAria && <button aria-label="查看更多任务">动态 aria</button>}
    </div>
  )
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return values.size
      },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, String(value)),
    }
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    })
    document.documentElement.lang = ""
  })

  it("translates UI text and attributes, then restores Chinese", async () => {
    render(
      <LanguageProvider>
        <TestContent />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "语言切换" }))

    await waitFor(() => {
      expect(screen.getByText("Pricing")).toBeTruthy()
      expect(
        screen.getByLabelText("Username").getAttribute("placeholder")
      ).toBe("Type a message...")
      expect(
        screen.getByPlaceholderText("Describe the video you want to create...")
          .textContent
      ).toBe("用户输入")
    })
    expect(screen.getByText("用户")).toBeTruthy()
    expect(document.documentElement.lang).toBe("en")
    expect(window.localStorage.getItem("app-language")).toBe("en")

    fireEvent.click(screen.getByRole("button", { name: "Switch language" }))

    await waitFor(() => {
      expect(screen.getByText("价格")).toBeTruthy()
      expect(screen.getByLabelText("用户名").getAttribute("placeholder")).toBe(
        "输入消息..."
      )
    })
    expect(document.documentElement.lang).toBe("zh-CN")
  })

  it("translates UI nodes added after English mode is enabled", async () => {
    window.localStorage.setItem("app-language", "en")
    render(
      <LanguageProvider>
        <TestContent />
      </LanguageProvider>
    )

    await waitFor(() => expect(screen.getByText("Pricing")).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: "添加" }))
    await waitFor(() => expect(screen.getByText("Loading...")).toBeTruthy())
  })

  it("translates the LIT-497 missing strings (task panel, voice, share-video carousel)", async () => {
    render(
      <LanguageProvider>
        <TestContent />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "语言切换" }))

    await waitFor(() => {
      // 任务区
      expect(screen.getByText("Recent tasks")).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "View more tasks" })
      ).toBeTruthy()
      // 音色相关
      expect(screen.getByText("Built-in voices")).toBeTruthy()
      expect(screen.getByText("Cloned voices")).toBeTruthy()
      expect(screen.getByText("Create cloned voice")).toBeTruthy()
      expect(screen.getByText("Voice name")).toBeTruthy()
      // 分享视频轮播
      expect(
        screen.getByTitle("Click to open the full video in a new tab")
      ).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "Previous video" })
      ).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "Next video" })
      ).toBeTruthy()
    })

    // 切回中文还原
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }))

    await waitFor(() => {
      expect(screen.getByText("最近任务")).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "查看更多任务" })
      ).toBeTruthy()
      expect(screen.getByText("预置音色")).toBeTruthy()
      expect(screen.getByText("克隆音色")).toBeTruthy()
      expect(screen.getByText("创建克隆音色")).toBeTruthy()
      expect(screen.getByText("音色名称")).toBeTruthy()
      expect(
        screen.getByTitle("点击后在新页面查看完整视频")
      ).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "上一条视频" })
      ).toBeTruthy()
      expect(
        screen.getByRole("button", { name: "下一条视频" })
      ).toBeTruthy()
    })
  })

  it("translates aria-labels on nodes added after English mode is enabled", async () => {
    window.localStorage.setItem("app-language", "en")
    render(
      <LanguageProvider>
        <TestContent />
      </LanguageProvider>
    )

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "View more tasks" })
      ).toBeTruthy()
    )
    fireEvent.click(screen.getByRole("button", { name: "添加 aria" }))
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "View more tasks" })
      ).toBeTruthy()
    )
  })

  it("translates studio edit page copy texts", async () => {
    function TestStudioContent() {
      const { toggleLanguage } = useLanguage()
      return (
        <div>
          <button onClick={toggleLanguage}>语言切换</button>
          <div>确认导出视频</div>
          <span>合成画面</span>
          <button>导出记录</button>
          <button>导出视频</button>
          <span>题干</span>
          <span>解题思路</span>
          <span>总结</span>
          <span>字幕</span>
          <span>编辑小技巧</span>
          <span>片头</span>
          <span>片尾</span>
          <span>背景</span>
          <span>水印</span>
          <button>应用模板</button>
        </div>
      )
    }

    render(
      <LanguageProvider>
        <TestStudioContent />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "语言切换" }))

    await waitFor(() => {
      // 编辑页面文案
      expect(screen.getByText("Confirm Video Export")).toBeTruthy()
      expect(screen.getByText("Canvas")).toBeTruthy()
      expect(screen.getByRole("button", { name: "Export history" })).toBeTruthy()
      expect(screen.getByRole("button", { name: "Export video" })).toBeTruthy()
      expect(screen.getByText("Question stem")).toBeTruthy()
      expect(screen.getByText("Solution steps")).toBeTruthy()
      expect(screen.getByText("Summary")).toBeTruthy()
      expect(screen.getByText("Subtitles")).toBeTruthy()
      expect(screen.getByText("Editing tips")).toBeTruthy()
      expect(screen.getByText("Intro")).toBeTruthy()
      expect(screen.getByText("Outro")).toBeTruthy()
      expect(screen.getByText("Background")).toBeTruthy()
      expect(screen.getByText("Watermark")).toBeTruthy()
      expect(screen.getByRole("button", { name: "Apply template" })).toBeTruthy()
    })

    // 切回中文还原
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }))

    await waitFor(() => {
      expect(screen.getByText("合成画面")).toBeTruthy()
      expect(screen.getByRole("button", { name: "导出记录" })).toBeTruthy()
      expect(screen.getByRole("button", { name: "导出视频" })).toBeTruthy()
    })
  })

  it("translates share, task list, 404 and loading pages copy texts", async () => {
    function TestAllPagesContent() {
      const { toggleLanguage } = useLanguage()
      return (
        <div>
          <button onClick={toggleLanguage}>语言切换</button>

          {/* 加载 & 404 */}
          <span>正在加载...</span>
          <span>页面找不到了</span>
          <span>返回首页</span>

          {/* 分享页面 */}
          <span>思考过程</span>
          <span>会话列表</span>
          <span>开启新对话</span>
          <span>暂无会话</span>

          {/* 任务列表 */}
          <span>待确认</span>
          <span>选择题</span>
          <span>解答题</span>
          <span>搜索文件</span>
          <span>批量删除</span>
        </div>
      )
    }

    render(
      <LanguageProvider>
        <TestAllPagesContent />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "语言切换" }))

    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeTruthy()
      expect(screen.getByText("Page not found")).toBeTruthy()
      expect(screen.getByText("Back to Home")).toBeTruthy()
      expect(screen.getByText("Thinking process")).toBeTruthy()
      expect(screen.getByText("Conversation list")).toBeTruthy()
      expect(screen.getByText("New chat")).toBeTruthy()
      expect(screen.getByText("No conversations")).toBeTruthy()
      expect(screen.getByText("Pending confirmation")).toBeTruthy()
      expect(screen.getByText("Multiple choice")).toBeTruthy()
      expect(screen.getByText("Open-ended")).toBeTruthy()
      expect(screen.getByText("Search files")).toBeTruthy()
      expect(screen.getByText("Bulk delete")).toBeTruthy()
    })

    // 切回中文
    fireEvent.click(screen.getByRole("button", { name: "Switch language" }))

    await waitFor(() => {
      expect(screen.getByText("页面找不到了")).toBeTruthy()
      expect(screen.getByText("待确认")).toBeTruthy()
    })
  })
})

