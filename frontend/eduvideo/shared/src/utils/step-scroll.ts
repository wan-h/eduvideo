import { measureText } from "@remotion/layout-utils"

import { stripMarkdown } from "./strip-markdown"

// ── 常量 ──

/** 图片固定高度 */
const IMAGE_HEIGHT = 280
/** 块级公式估算高度（KaTeX 渲染后常见 40-80px，复杂矩阵可达 200px+，取中间值） */
export const BLOCK_FORMULA_HEIGHT = 60

/** measureText 中英文混合换行估算偏差补偿 */
const LINE_WIDTH_FACTOR = 1.05

// ── 表格样式常量（与 md-components.tsx 保持同步）──
/** table 内 th/td 实际行高倍数 */
const TABLE_CELL_LINE_HEIGHT = 1.5
/** table 段落间 margin（0.6em ≈ 16px @ fontSize 26） */
const TABLE_PARA_MARGIN = 16

/**
 *  intro 固定高度补偿
 */
export const INLINE_FORMULA_HEIGHT = 15

// ── 行内公式分类 ──

/** 行内公式复杂度等级 */
export type FormulaComplexity = "simple" | "medium" | "tall" | "complex"

/** LaTeX 特征正则 → 复杂度等级（按优先级排列，匹配第一个即停止） */
const COMPLEXITY_RULES: Array<{ pattern: RegExp; level: FormulaComplexity }> = [
  // tall: 分数、根号、组合数、上下线 — 渲染后明显高于文本行
  {
    pattern:
      /\\(?:frac|dfrac|tfrac|sqrt|binom|overline|underline|overrightarrow|overleftarrow|overleftrightarrow|underleftarrow|underrightarrow|underleftrightarrow)\b/,
    level: "tall",
  },
  // complex: 极限、求和、积分等 — 带上下方标注，高度较高
  {
    pattern:
      /\\(?:lim|sup|inf|sum|prod|int|iint|iiint|oint|bigcup|bigcap|bigvee|bigwedge|bigodot|bigotimes|bigoplus|coprod)\b/,
    level: "complex",
  },
  // medium: 上下标、帽子、向量、化学宏等 — 略高于文本行
  {
    pattern:
      /\^{[^}]+}|_\{[^}]+}|\^[^{]|_[^{]|\\(?:ce|hat|vec|bar|tilde|widehat|dot|ddot|overbrace|underbrace|acute|grave|breve|check)\b/,
    level: "medium",
  },
  // simple: 以上均不匹配（纯变量、数字、简单运算符）— 与文本等高
]

/** 各复杂度的高度补偿（px），同一行取最大值 */
const FORMULA_HEIGHT_BONUS: Record<FormulaComplexity, number> = {
  // KaTeX 行内公式按复杂度递增补偿
  simple: 1,
  medium: 3,
  tall: 10,
  complex: 12,
}

/**
 * 各复杂度公式渲染后的等效字符数（用于替换 LaTeX 源码做宽度测量）。
 * LaTeX 源码（如 \frac{a}{b} = 12 chars）被 measureText 当纯文本测宽度，
 * 但 KaTeX 渲染后远小于此。用此等效字符数的占位符替换后再测量。
 */
const FORMULA_EQUIVALENT_CHARS: Record<FormulaComplexity, number> = {
  simple: 1.5, // $x$ → 渲染约 1 字符宽
  medium: 2, // $x^2$ → 渲染约 2 字符宽
  tall: 3, // $\frac{a}{b}$ → 渲染约 3-4 字符宽
  complex: 3, // $\sum_{i=1}^{n}$ → 渲染约 3-4 字符宽
}

// ── 纯函数 ──

/** 统计 markdown 中的图片数量 */
export function countImages(md: string): number {
  const matches = md.match(/!\[.*?\]\(.*?\)/g)
  return matches ? matches.length : 0
}

/** 统计 markdown 中的块级公式（$$...$$）数量 */
export function countBlockFormulas(md: string): number {
  const matches = md.match(/\$\$[\s\S]*?\$\$/g)
  return matches ? matches.length : 0
}

/** 统计 markdown 中的行内公式（$...$，排除 $$ 块级）数量 */
export function countInlineFormulas(md: string): number {
  const matches = md.match(/(?<!\$)\$(?!\$)[^$\n]+?\$(?!\$)/g)
  return matches ? matches.length : 0
}

/** 将 HTML <table> 简易转化为 GFM 表格字符串供高度计算 */
function convertHtmlTableToGfm(html: string): string {
  if (!html.includes("<table")) return html
  return html.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
    const rowMatches = match.match(/<tr[\s\S]*?<\/tr>/gi)
    if (!rowMatches || rowMatches.length === 0) return match
    const rows: string[][] = []
    let maxCols = 0
    for (const rowHtml of rowMatches) {
      const cellMatches = rowHtml.match(/<(td|th)[\s\S]*?>([\s\S]*?)<\/(td|th)>/gi)
      if (!cellMatches) continue
      const rowCells: string[] = []
      for (const cellHtml of cellMatches) {
        const textMatch = cellHtml.match(/<(td|th)[\s\S]*?>([\s\S]*?)<\/(td|th)>/i)
        let cellText = textMatch ? textMatch[2] : ""
        cellText = cellText.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\|/g, "\\|").trim()
        rowCells.push(cellText)
      }
      if (rowCells.length > maxCols) maxCols = rowCells.length
      rows.push(rowCells)
    }
    if (rows.length === 0 || maxCols === 0) return match
    const lines: string[] = []
    const headerRow = rows[0]
    while (headerRow.length < maxCols) headerRow.push("")
    lines.push("| " + headerRow.join(" | ") + " |")
    lines.push("| " + Array(maxCols).fill("---").join(" | ") + " |")
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      while (row.length < maxCols) row.push("")
      lines.push("| " + row.join(" | ") + " |")
    }
    return lines.join("\n")
  })
}

/** 判断段落是否包含表格（GFM 表格或 HTML <table>） */
function isTableParagraph(para: string): boolean {
  if (/<table[\s\S]*?<\/table>/i.test(para)) return true
  const lines = para.split("\n").filter(Boolean)
  if (lines.length < 2) return false
  const allPipes = lines.every((l) => /^\s*\|.+\|\s*$/.test(l))
  const hasSeparator = /^\s*\|[\s:|-]+\|\s*$/.test(lines[1])
  return allPipes && hasSeparator
}

/**
 * 估算 GFM/HTML 表格段的高度。
 * 按列均分 maxWidth，对每格内文本做字符宽度换行估算，取所有列所需行数的最大值。
 * 与 md-components.tsx 中 th/td 实际样式（fontSize 22, lineHeight 1.5, padding 16 20）保持一致。
 */
export function calcTableHeight(params: {
  md: string
  maxWidth: number
  scale?: number
  fontSize?: number
}): number {
  const { md, maxWidth, scale = 1, fontSize = 28 } = params
  const paragraphs = md.split("\n\n").filter(Boolean)
  let total = 0

  for (const para of paragraphs) {
    if (!isTableParagraph(para)) continue
    const tableMarkdown = para.includes("<table") ? convertHtmlTableToGfm(para) : para
    const lines = tableMarkdown.split("\n").filter(Boolean)
    if (lines.length < 2) continue
    const headerCells = lines[0].split("|").filter((c) => c.trim() !== "")
    const colCount = Math.max(1, headerCells.length)
    const colWidth = maxWidth / colCount

    // 表格内单行高度：取所有列中所需行数最多的一列
    const cellFontSize = fontSize * 0.9
    const cellPaddingY = fontSize * 0.7 * 2 // top + bottom

    const rowHeight = (rawLine: string): number => {
      const cells = rawLine.split("|").filter((c) => c.trim() !== "")
      let maxCellLines = 1
      for (const cell of cells) {
        const cellW = stripMarkdown(cell).length * cellFontSize * 0.5
        const lines = Math.max(1, Math.ceil(cellW / colWidth))
        maxCellLines = Math.max(maxCellLines, lines)
      }
      return cellPaddingY + maxCellLines * cellFontSize * TABLE_CELL_LINE_HEIGHT
    }

    // 表头(行 0) + 数据行(行 2..n)
    total += rowHeight(lines[0])
    for (let i = 2; i < lines.length; i++) {
      total += rowHeight(lines[i])
    }
    total += TABLE_PARA_MARGIN * scale
  }

  return total
}

/** 分类单个行内公式的复杂度 */
function classifyFormula(latex: string): FormulaComplexity {
  for (const { pattern, level } of COMPLEXITY_RULES) {
    if (pattern.test(latex)) return level
  }
  return "simple"
}

/** 单个行内公式的分析结果 */
interface FormulaDetail {
  /** 所在物理行在段落内的索引 */
  lineIdx: number
  /** 公式复杂度 */
  complexity: FormulaComplexity
  /** LaTeX 源码字符数（不含 $ 符号） */
  sourceLength: number
}

/** 段落内行级公式分析结果 */
interface LineFormulaAnalysis {
  /** 段落内每物理行的最大高度补偿（取该行所有公式的 max） */
  lineMaxBonuses: number[]
  /** 每个公式的详细信息（含行索引、复杂度、源码长度） */
  formulaDetails: FormulaDetail[]
}

/**
 * 分析一个段落内每行的公式分布。
 * 段落 = 被 `\n\n` 分隔的文本块，内部以 `\n` 分物理行。
 */
function analyzeLineFormulas(paragraph: string): LineFormulaAnalysis {
  const lines = paragraph.split("\n")
  const lineMaxBonuses: number[] = []
  const formulaDetails: FormulaDetail[] = []

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]
    const formulaMatches = line.matchAll(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g)
    let maxBonus = 0

    for (const match of formulaMatches) {
      const latex = match[1]
      const complexity = classifyFormula(latex)
      const bonus = FORMULA_HEIGHT_BONUS[complexity]
      maxBonus = Math.max(maxBonus, bonus)

      formulaDetails.push({
        lineIdx: li,
        complexity,
        sourceLength: latex.length,
      })
    }

    lineMaxBonuses.push(maxBonus)
  }

  return { lineMaxBonuses, formulaDetails }
}

/**
 * 计算 markdown 文本中行内公式的行级高度补偿总和。
 * 同一物理行的多个公式取最大高度（非累加）。
 * 供 intro.tsx 等需要独立使用高度补偿的场景。
 */
export function calcInlineFormulaHeightBonus(md: string): number {
  if (!md.trim()) return 0

  const paragraphs = md.split("\n\n").filter(Boolean)
  let total = 0

  for (const para of paragraphs) {
    const analysis = analyzeLineFormulas(para)
    total += analysis.lineMaxBonuses.reduce((a, b) => a + b, 0)
  }

  return total
}

/** 计算纯文本在给定宽度下的估算行数 */
export function countLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  fontFamily: string
): number {
  if (!text.trim()) return 0
  try {
    const { width } = measureText({
      text: text.trim(),
      fontFamily,
      fontSize,
      validateFontIsLoaded: true,
    })
    return Math.max(1, Math.ceil((width * LINE_WIDTH_FACTOR) / maxWidth))
  } catch {
    // 字体未加载时回退到字符估算
    return Math.max(1, Math.ceil((text.length * fontSize * 0.5) / maxWidth))
  }
}

/** 计算 markdown 内容的估算高度（含图片 + 块级公式 + 行内公式） */
export function calcMdHeight(params: {
  md: string
  fontSize: number
  lineHeight: number
  maxWidth: number
  fontFamily: string
  scale?: number
  imageHeight?: number
}): number {
  const {
    md,
    fontSize,
    lineHeight,
    maxWidth,
    fontFamily,
    scale = 1,
    imageHeight = IMAGE_HEIGHT * scale,
  } = params
  if (!md.trim()) return 0

  const imageCount = countImages(md)
  const blockFormulaCount = countBlockFormulas(md)
  // 表格段独立按 th/td 实际样式估算,跳过 measureText 文本流
  const tableHeight = calcTableHeight({ md, maxWidth, scale, fontSize })

  // ── 按段落分析行内公式（替代简单的 countInlineFormulas）──
  const paragraphs = md.split("\n\n").filter(Boolean)
  let totalLines = 0
  let totalFormulaHeightBonus = 0

  for (const para of paragraphs) {
    // 纯表格段:tableHeight 已涵盖,跳过文本行测量,避免双重计算
    if (isTableParagraph(para)) continue

    const analysis = analyzeLineFormulas(para)

    // 将行内公式 $LaTeX源码$ 替换为按复杂度分类的等效字符占位符后再测量宽度。
    // LaTeX 源码（如 \frac{a}{b} = 12 chars）被 measureText 当纯文本测宽度，
    // 但 KaTeX 渲染后远小于此。用等效字符数替代可准确估算行数。
    let measuredPara = para
    for (const f of analysis.formulaDetails) {
      // 逐个替换（每次匹配第一个未替换的 $...$）
      measuredPara = measuredPara.replace(
        /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/,
        "X".repeat(FORMULA_EQUIVALENT_CHARS[f.complexity])
      )
    }
    // stripMarkdown（此时公式已是 "XX" 占位符，不会被保留为 LaTeX 源码）
    const stripped = stripMarkdown(measuredPara)

    // 按物理行拆分后逐行测量（measureText 忽略 \n，需手动分行）
    const physicalLines = stripped.split("\n").filter(Boolean)
    let paraLines = 0

    for (const line of physicalLines) {
      paraLines += countLines(line, fontSize, maxWidth, fontFamily)
    }

    totalLines += Math.max(physicalLines.length, paraLines)
    // 高度补偿：每行取最大公式补偿（非累加）
    totalFormulaHeightBonus += analysis.lineMaxBonuses.reduce(
      (a, b) => a + b,
      0
    )
  }

  const paraMarginBonus = Math.max(0, paragraphs.length - 1) * fontSize * 0.6
  const rawHeight =
    totalLines * fontSize * lineHeight +
    imageCount * imageHeight +
    blockFormulaCount * BLOCK_FORMULA_HEIGHT * scale +
    tableHeight +
    totalFormulaHeightBonus * scale +
    paraMarginBonus
  return Math.ceil(rawHeight)
}

/** 计算步骤的累积偏移量数组，每个元素 offset[i] = 步骤 i 顶部相对于第一个步骤顶部的距离 */
export function calcStepOffsets(heights: number[], gap: number): number[] {
  const offsets: number[] = []
  let accumulated = 0
  for (const h of heights) {
    offsets.push(accumulated)
    accumulated += h + gap
  }
  return offsets
}

/**
 * 计算单步骤的目标滚动位置。
 * stepHeights 已经是"接近真实"的估算（含段落间距显式补偿，不再用 SAFETY_FACTOR 黑箱），
 * 所以直接用 offset + height - visibleHeight，无需再 ÷ SAFETY_DIVISOR。
 */
export function calcTargetScroll(params: {
  offset: number
  height: number
  visibleHeight: number
  topPadding: number
}): number {
  const { offset, height, visibleHeight, topPadding } = params

  if (height < visibleHeight) {
    // 正常步骤：底部贴视口下边界
    return Math.max(0, offset + height - visibleHeight)
  }
  // 超大步骤：顶部贴视口上边界（留 padding）
  return Math.max(0, offset - topPadding)
}
