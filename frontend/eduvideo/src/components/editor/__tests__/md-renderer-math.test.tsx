import { MdRenderer } from "@ask2vid/shared"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

const A = String.raw`\angle AHE = 90^{\circ} - \angle BHE = 90^{\circ} - \alpha`
const B = String.raw`\cos \angle AHE = \cos(90^{\circ} - \alpha) = \sin \alpha = \frac{4}{5}`

describe("MdRenderer LaTeX", () => {
  it("renders adjacent inline formulas split by Plate serialization", () => {
    // Plate 把相邻的行内公式序列化成 $a$$b$，直接渲染会显示 LaTeX 源码
    const { container } = render(
      <MdRenderer content={"- 观察角的位置关系：\n  $" + A + "$$" + B + "$"} />
    )

    expect(container.innerHTML).not.toContain("katex-error")
    expect(container.innerHTML).toContain('class="katex"')
    // 两个公式分别渲染
    expect(container.querySelectorAll(".katex").length).toBe(2)
  })

  it("keeps display formulas untouched", () => {
    const { container } = render(
      <MdRenderer content={`$$\n${A}\n$$\n\n$$\n${B}\n$$`} />
    )

    expect(container.innerHTML).not.toContain("katex-error")
    expect(container.querySelectorAll(".katex-display").length).toBe(2)
  })
})
