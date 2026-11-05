import { describe, expect, it } from "vitest"
import {
  convertHtmlTablesToMarkdown,
  ensureBlankLineAfterHtmlBlock,
  preprocessMarkdownForEditor,
  protectMathPipes,
} from "../markdown-preprocessor"

describe("markdown-preprocessor", () => {
  it("converts HTML tables to GFM Markdown tables", () => {
    const htmlTable = `<table><tr><td></td><td>平均数</td><td>中位数</td><td>众数</td></tr><tr><td>教师评委</td><td>a</td><td>84</td><td>b</td></tr><tr><td>学生评委</td><td>82</td><td>m</td><td>85</td></tr></table>`

    const converted = convertHtmlTablesToMarkdown(htmlTable)

    expect(converted).toContain("|  | 平均数 | 中位数 | 众数 |")
    expect(converted).toContain("| --- | --- | --- | --- |")
    expect(converted).toContain("| 教师评委 | a | 84 | b |")
    expect(converted).toContain("| 学生评委 | 82 | m | 85 |")
  })

  it("protects pipes inside LaTeX math formulas", () => {
    const mathStr = "若 $a | b$ 且 $$x | y$$"
    const protectedStr = protectMathPipes(mathStr)

    expect(protectedStr).toBe("若 $a \\vert  b$ 且 $$x \\vert  y$$")
  })

  it("ensures blank lines after HTML elements and table lines", () => {
    const str = "<table>...</table>\n![](https://example.com/img.jpg)"
    const ensured = ensureBlankLineAfterHtmlBlock(str)

    expect(ensured).toBe(
      "<table>...</table>\n\n![](https://example.com/img.jpg)"
    )
  })

  it("preprocesses full problem stem with HTML table, LaTeX math, and images correctly", () => {
    const stem = `15. 为践行“健康第一”的教育理念，某校开展了创意课间操比赛...
①教师评委给甲队的打分分别为：80，84，84，86，91 
②学生评委给甲队的打分的频数分布直方图如图（分数用 $x$ 表示，数据分为4组，第1组： $60\\leq x < 70$ 第2组： $70\\leq x < 80$ ）：
③评委对甲队打分数据的平均数、中位数、众数如下：
<table><tr><td></td><td>平均数</td><td>中位数</td><td>众数</td></tr><tr><td>教师评委</td><td>a</td><td>84</td><td>b</td></tr><tr><td>学生评委</td><td>82</td><td>m</td><td>85</td></tr></table>
![](https://cdn.example.com/image1.jpg)
![](https://cdn.example.com/image2.jpg)
根据以上信息，回答下列问题：`

    const processed = preprocessMarkdownForEditor(stem)

    // 1. Table is converted to Markdown
    expect(processed).toContain("|  | 平均数 | 中位数 | 众数 |")
    // 2. Blank lines exist between table and images
    expect(processed).toMatch(/\|[\s\n]+!\[/)
    // 3. Images exist in processed markdown
    expect(processed).toContain("![](https://cdn.example.com/image1.jpg)")
    expect(processed).toContain("![](https://cdn.example.com/image2.jpg)")
    // 4. LaTeX formula with '<' remains untouched
    expect(processed).toContain("$60\\leq x < 70$")
  })
})
