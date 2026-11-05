import { ThemeProvider } from "@/components/theme-provider"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { TooltipProvider } from "@/components/ui/tooltip"
import { fireEvent, render, screen } from "@testing-library/react"
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

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: createStorage(),
    })
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }),
    })
    document.documentElement.className = ""
  })

  it("selects light, dark, and system modes from the dropdown", () => {
    render(
      <ThemeProvider defaultTheme="light" disableTransitionOnChange={false}>
        <TooltipProvider>
          <ThemeSwitcher />
        </TooltipProvider>
      </ThemeProvider>
    )

    expect(document.documentElement.classList.contains("light")).toBe(true)

    fireEvent.pointerDown(screen.getByRole("button", { name: "主题切换" }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(screen.getByRole("menuitemradio", { name: "暗色模式" }))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("theme")).toBe("dark")

    fireEvent.pointerDown(screen.getByRole("button", { name: "主题切换" }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(screen.getByRole("menuitemradio", { name: "系统主题" }))
    expect(document.documentElement.classList.contains("light")).toBe(true)
    expect(localStorage.getItem("theme")).toBe("system")

    fireEvent.pointerDown(screen.getByRole("button", { name: "主题切换" }), {
      button: 0,
      ctrlKey: false,
    })
    fireEvent.click(screen.getByRole("menuitemradio", { name: "亮色模式" }))
    expect(document.documentElement.classList.contains("light")).toBe(true)
    expect(localStorage.getItem("theme")).toBe("light")
  })
})
