import "katex/contrib/mhchem"
import "katex/dist/katex.min.css"
import { useMemo, type CSSProperties } from "react"
import ReactMarkdown from "react-markdown"
import rehypeKatex from "rehype-katex"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import { createComponents, createPreviewComponents } from "./md-components"

// ============================================================
// MdRenderer — 基于 react-markdown 的 Markdown 渲染组件
//
// 支持：
//   - GFM（表格、删除线、任务列表、自动链接等）
//   - 数学公式（$ 行内 / $$ 块级，由 KaTeX 渲染）
//   - 内联样式（兼容 Remotion 视频合成渲染环境）
//
// 两种模式：
//   - mode="full"    : 完整 Markdown 块级排版（默认）
//   - mode="preview" : 裁剪为单行内联预览，适用于卡片摘要
// ============================================================

export interface MdRendererProps {
  /** Markdown 文本内容 */
  content: string
  /** 渲染模式，full = 完整排版；preview = 单行内联预览 */
  mode?: "full" | "preview"
  /** 基准字体大小（px），默认 14 */
  fontSize?: number
  /** 文字颜色，默认继承父元素 */
  color?: string
  /** 行高倍数，默认 1.6 */
  lineHeight?: number
  /** 图片固定高度(px)，不传则使用 maxHeight: 324px */
  imageHeight?: number
  /** 外层容器额外的内联样式 */
  style?: CSSProperties
  /** 外层容器额外的 className（仅用于非 Remotion 场景） */
  className?: string
}

const REMARK_PLUGINS = [remarkMath, remarkGfm]
const REHYPE_PLUGINS = [
  rehypeRaw,
  [rehypeKatex, { output: "html" }] as [typeof rehypeKatex, { output: string }],
]

/**
 * 预处理：将 $...$ 内的 | 替换为 \vert，防止 GFM 表格将其当作列分隔符。
 * KaTeX 中 \vert 与 | 渲染效果完全一致。
 *
 * 处理顺序：先匹配 $$...$$ 块级公式，再匹配 $...$ 行内公式。
 * 使用 neg-lookbehind 跳过已转义的 \|。
 */
function protectMathPipes(md: string): string {
  return md
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) =>
      math.includes("|")
        ? "$$" + math.replace(/(?<!\\)\|/g, "\\vert ") + "$$"
        : _
    )
    .replace(/\$([^$\n]*)\$/g, (_, math) =>
      math.includes("|") ? "$" + math.replace(/(?<!\\)\|/g, "\\vert ") + "$" : _
    )
}

/**
 * 拆分相邻的行内公式：Plate 编辑器会把单行 $$...$$ 当成行内公式，
 * 序列化后相邻公式会拼成 `$a$$b$`。remark-math 无法把它拆成两个公式，
 * 会整体当作普通文本，直接显示 LaTeX 源码。此处把中缝拆成 `$a$ $b$`，
 * 还原为两个行内公式。块级公式（$$ 独占一行）不受影响。
 */
function separateAdjacentInlineMath(md: string): string {
  let result = md
  let previous = ""
  // 每轮拆开一处中缝，处理 $a$$b$$c$ 这类多个公式连续的情况
  while (result !== previous) {
    previous = result
    result = result.replace(
      /(?<!\$)\$([^$\n]+?)\$\$/g,
      (_, math) => `$${math}$ $`
    )
  }
  return result
}

/**
 * CommonMark 规定 HTML 块会持续到遇到空行。MinerU 的 table_body 是 HTML
 * `<table>...</table>`，如果紧接的 markdown 图片/段落没有空行间隔，
 * 会被吞入 HTML 块当做原始文本。GFM 管道表格（| 结尾行）也有同样问题。
 * 本函数在 HTML 闭合标签或 GFM 表格行后面、紧接非空内容之间补上空行。
 */
function ensureBlankLineAfterHtmlBlock(md: string): string {
  // 匹配 HTML 闭合标签行后紧接非空行（单换行、无空行）
  return md
    .replace(/(<\/\w+>[ \t]*)\n(?!\n)/g, "$1\n\n")
    .replace(/(\|[ \t]*)\n(!\[)/g, "$1\n\n$2")
}

/**
 * 将连续的独立图片段落合并为同一段落。
 * 后端按块拼接时每个图片是独立段落（\n\n 分隔），渲染会竖向堆叠；
 * 合并后由 md-components 的纯图片段落 flex 布局横向居中排列，放不下换行。
 * 用于题目内容展示（题目介绍页、左分屏原题卡片）。
 */
export function mergeConsecutiveImages(md: string): string {
  return md.replace(/(!\[[^\]]*\]\([^)]*\))\s*\n\s*(?=!\[)/g, "$1\n")
}

/**
 * 将 LaTeX 标准定界符 \(...\) / \[...\] 归一化为 remark-math 支持的
 * $...$ / $$...$$。大模型常输出前一种写法，remark-math 不识别，会被
 * Markdown 当作转义括号，直接显示 LaTeX 源码（如 "(\triangle HFC)"）。
 */
function normalizeLatexDelimiters(md: string): string {
  return md
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([^\n]*?)\\\)/g, (_, math) => `$${math.trim()}$`)
}

function preprocessMarkdown(md: string): string {
  return protectMathPipes(
    ensureBlankLineAfterHtmlBlock(
      separateAdjacentInlineMath(normalizeLatexDelimiters(md))
    )
  )
}

export function MdRenderer({
  content,
  mode = "full",
  fontSize = 14,
  color = "currentColor",
  lineHeight = 1.6,
  imageHeight,
  style,
  className,
}: MdRendererProps) {
  const components = useMemo(
    () =>
      mode === "preview"
        ? createPreviewComponents()
        : createComponents({ fontSize, color, lineHeight, imageHeight }),
    [mode, fontSize, color, lineHeight, imageHeight]
  )

  const containerStyle: CSSProperties = {
    fontSize,
    color,
    lineHeight,
    wordBreak: "break-word",
    ...style,
  }

  return (
    <div style={containerStyle} className={className}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {preprocessMarkdown(content)}
      </ReactMarkdown>
    </div>
  )
}
