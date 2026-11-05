import { describe, expect, it } from "vitest"

import { translateShareVideoTitle } from "./data-translations"

describe("translateShareVideoTitle", () => {
  it("原样返回后端传递的标题字符串", () => {
    expect(translateShareVideoTitle("数学奥数题讲解")).toBe("数学奥数题讲解")
    expect(translateShareVideoTitle("Math Olympiad Explanation")).toBe(
      "Math Olympiad Explanation"
    )
  })
})
