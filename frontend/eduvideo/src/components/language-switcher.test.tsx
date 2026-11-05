import { LanguageSwitcher } from "@/components/language-switcher"
import { LanguageProvider } from "@/i18n/language-provider"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

function createStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createStorage(),
    })
    document.documentElement.lang = ""
  })

  it("defaults to Chinese and selects English from the dropdown", async () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher />
      </LanguageProvider>
    )

    expect(document.documentElement.lang).toBe("zh-CN")
    expect(localStorage.getItem("app-language")).toBeNull()

    fireEvent.pointerDown(screen.getByRole("button", { name: "语言切换" }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen
        .getByRole("menuitemradio", { name: "中文" })
        .getAttribute("data-state")
    ).toBe("checked")

    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }))

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en")
      expect(localStorage.getItem("app-language")).toBe("en")
    })
  })
})
