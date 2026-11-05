import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react"
import type { Components, ExtraProps } from "react-markdown"

import { THEME } from "../styles/theme"

// ============================================================
// Remotion Markdown 元素内联样式映射
// 因 Remotion 渲染环境需内联样式，不依赖外部 CSS 类
// ============================================================

interface StyleConfig {
  fontSize: number
  color: string
  lineHeight: number
  imageHeight?: number
}

/** 判断段落是否只含图片（图片间允许空白），用于多图横向布局 */
function isImageOnlyParagraph(node: ExtraProps["node"]): boolean {
  if (!node) return false
  let hasImage = false
  for (const child of node.children) {
    if (child.type === "text") {
      if (child.value.trim() !== "") return false
    } else if (child.type === "element" && child.tagName === "img") {
      hasImage = true
    } else {
      return false
    }
  }
  return hasImage
}

const createComponents = ({
  fontSize,
  color,
  lineHeight,
  imageHeight,
}: StyleConfig): Components => {
  const baseText: CSSProperties = {
    fontSize,
    color,
    lineHeight,
    fontFamily: "inherit",
    textShadow: THEME.textShadow.chalk,
  }

  return {
    // ── 段落 ──
    // 纯图片段落：多图居中横向排列，放不下自动换行（避免连续图片竖向堆叠）
    p: ({ children, node }) => {
      if (isImageOnlyParagraph(node)) {
        return (
          <span
            style={{
              ...baseText,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.75em",
              width: "100%",
              margin: "0 0 0.6em 0",
            }}
          >
            {Children.map(children, (child) => {
              if (!isValidElement(child)) return null
              // children 是未渲染的 img 组件元素，注入 style 由 img 组件合并
              return cloneElement(
                child as ReactElement<{ style?: CSSProperties }>,
                { style: { margin: 0, flexShrink: 0 } }
              )
            })}
          </span>
        )
      }
      return (
        <span
          style={{
            ...baseText,
            display: "inline-block",
            width: "100%",
            whiteSpace: "pre-wrap",
            margin: "0 0 0.6em 0",
          }}
        >
          {children}
        </span>
      )
    },

    // ── 标题 ──
    h1: ({ children }) => (
      <h1
        style={{
          ...baseText,
          fontSize: fontSize * 1.6,
          fontWeight: 700,
          margin: "0 0 0.5em 0",
          lineHeight: 1.3,
        }}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        style={{
          ...baseText,
          fontSize: fontSize * 1.35,
          fontWeight: 600,
          margin: "0 0 0.4em 0",
          lineHeight: 1.3,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        style={{
          ...baseText,
          fontSize: fontSize * 1.15,
          fontWeight: 600,
          margin: "0 0 0.4em 0",
        }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        style={{
          ...baseText,
          fontSize: fontSize * 1.05,
          fontWeight: 600,
          margin: "0 0 0.3em 0",
        }}
      >
        {children}
      </h4>
    ),

    // ── 强调 ──
    strong: ({ children }) => (
      <strong style={{ ...baseText, fontWeight: 700 }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ ...baseText, fontStyle: "italic" }}>{children}</em>
    ),

    // ── 代码 ──
    code: ({ children, className }) => {
      // 块级代码由 pre > code 组成，className 包含 language-*
      const isInline = !className
      if (isInline) {
        return (
          <code
            style={{
              ...baseText,
              fontFamily: "monospace",
              backgroundColor: "rgba(0,0,0,0.08)",
              padding: "0.1em 0.35em",
              borderRadius: "3px",
              fontSize: fontSize * 0.88,
            }}
          >
            {children}
          </code>
        )
      }
      return (
        <code style={{ ...baseText, fontFamily: "monospace" }}>{children}</code>
      )
    },
    pre: ({ children }) => (
      <pre
        style={{
          ...baseText,
          fontFamily: "monospace",
          backgroundColor: "rgba(0,0,0,0.06)",
          padding: "0.75em 1em",
          borderRadius: "6px",
          overflowX: "auto",
          margin: "0 0 0.75em 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontSize: fontSize * 0.88,
        }}
      >
        {children}
      </pre>
    ),

    // ── 列表 ──
    ul: ({ children }) => (
      <ul
        style={{
          ...baseText,
          paddingLeft: "1.4em",
          margin: "0 0 0.6em 0",
          listStyleType: "disc",
        }}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        style={{
          ...baseText,
          paddingLeft: "1.4em",
          margin: "0 0 0.6em 0",
          listStyleType: "decimal",
        }}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li style={{ ...baseText, marginBottom: "0.2em" }}>{children}</li>
    ),

    // ── 引用 ──
    blockquote: ({ children }) => (
      <blockquote
        style={{
          ...baseText,
          borderLeft: `3px solid ${color}`,
          opacity: 0.7,
          paddingLeft: "1em",
          margin: "0 0 0.6em 0",
          fontStyle: "italic",
        }}
      >
        {children}
      </blockquote>
    ),

    // ── 分割线 ──
    hr: () => (
      <hr
        style={{
          border: "none",
          borderTop: `1px solid rgba(0,0,0,0.12)`,
          margin: "0.75em 0",
        }}
      />
    ),

    // ── 链接 ──
    a: ({ children, href }) => (
      <a
        href={href}
        style={{
          ...baseText,
          color: "#3b82f6",
          textDecoration: "underline",
        }}
      >
        {children}
      </a>
    ),

    // ── GFM: 表格 ──
    table: ({ children }) => (
      <div
        style={{
          width: "100%",
          overflowX: "auto",
          borderRadius: 8,
          border: "2px solid #555",
          backgroundColor: "transparent",
          boxShadow: `
            0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderSpacing: 0,
            fontFamily: THEME.fontFamily,
            color: THEME.colors.chalkWhite,
          }}
        >
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr
        style={{
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        {children}
      </tr>
    ),
    th: ({ children }) => (
      <th
        style={{
          padding: `${fontSize * 0.7}px ${fontSize * 0.9}px`,
          backgroundColor: "rgba(68, 68, 68, 0.7)",
          color: THEME.colors.chalkYellow,
          fontSize: fontSize * 0.9,
          fontWeight: 700,
          lineHeight: 1.5,
          textAlign: "left",
          borderBottom: `2px solid ${THEME.colors.tableBorder}`,
          borderRight: "1px solid #666",
          fontFamily: THEME.fontFamily,
          textShadow: THEME.textShadow.chalk,
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        style={{
          padding: `${fontSize * 0.7}px ${fontSize * 0.9}px`,
          backgroundColor: THEME.colors.tableCellBg,
          color: THEME.colors.chalkWhite,
          fontSize: fontSize * 0.9,
          fontWeight: 400,
          lineHeight: 1.5,
          textAlign: "left",
          borderBottom: `1px solid ${THEME.colors.tableBorder}`,
          borderRight: "1px solid #444",
          fontFamily: THEME.fontFamily,
          textShadow: THEME.textShadow.chalk,
        }}
      >
        {children}
      </td>
    ),

    // ── GFM: 删除线 ──
    del: ({ children }) => (
      <del style={{ ...baseText, textDecoration: "line-through" }}>
        {children}
      </del>
    ),

    // ── 下划线 ──
    u: ({ children }) => (
      <u style={{ ...baseText, textDecoration: "underline" }}>{children}</u>
    ),

    // ── 图片 ──
    // 注意：img 可能被包裹在 <p> 内，不能用 <div> 包装（违反 DOM 嵌套规则）
    // style 参数用于纯图片段落（flex 布局）注入 margin/flexShrink 覆写
    img: ({ src, alt, style }) => (
      <img
        src={src}
        alt={alt ?? ""}
        style={{
          display: "block",
          maxWidth: "100%",
          ...(imageHeight
            ? { height: imageHeight, objectFit: "contain" }
            : { maxHeight: "324px", objectFit: "contain" }),
          borderRadius: "8px",
          margin: "0px auto",
          ...style,
        }}
      />
    ),
  }
}

// ── 专为卡片预览裁剪的轻量组件（纯行内，不继承任何视频渲染样式） ──
const createPreviewComponents = (): Components => ({
  p: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  h1: ({ children }: { children?: ReactNode }) => (
    <span style={{ fontWeight: 700 }}>{children}</span>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <span style={{ fontWeight: 700 }}>{children}</span>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <span style={{ fontWeight: 600 }}>{children}</span>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <span style={{ fontWeight: 600 }}>{children}</span>
  ),
  ul: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  ol: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  li: ({ children }: { children?: ReactNode }) => <span>{children} </span>,
  br: () => <span> </span>,

  // ── GFM: 表格（简约边框） ──
  table: ({ children }) => (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "inherit",
        border: "1px solid rgba(0,0,0,0.15)",
      }}
    >
      {children}
    </table>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.1)" }}>{children}</tr>
  ),
  th: ({ children }) => (
    <th
      style={{
        padding: "4px 8px",
        borderBottom: "1px solid rgba(0,0,0,0.2)",
        borderRight: "1px solid rgba(0,0,0,0.1)",
        fontWeight: 600,
        textAlign: "left",
        backgroundColor: "rgba(0,0,0,0.03)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: "4px 8px",
        borderRight: "1px solid rgba(0,0,0,0.05)",
        textAlign: "left",
      }}
    >
      {children}
    </td>
  ),

  // ── 下划线 ──
  u: ({ children }: { children?: ReactNode }) => (
    <u style={{ textDecoration: "underline" }}>{children}</u>
  ),
})

export { createComponents, createPreviewComponents }
export type { StyleConfig }
