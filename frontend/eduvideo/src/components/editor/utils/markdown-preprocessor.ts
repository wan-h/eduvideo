/**
 * Markdown 预处理工具库
 *
 * 针对编辑场景（PlateEditor）：
 * 1. 将 HTML <table>...</table> 转为 GFM Markdown 表格语法 (| ... |)
 * 2. 保护数学公式 $...$ 和 $$...$$ 中的管道符 | 为 \vert，防止 GFM 表格逻辑错乱
 * 3. 确保 HTML 闭合标签或表格之后留有空行，防止 CommonMark 吞噬随后的图片和文本
 */

/**
 * 将 HTML <table>...</table> 字符串转化为 GFM 管道表格
 */
export function convertHtmlTablesToMarkdown(md: string): string {
  if (!md.includes("<table")) return md

  return md.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
    // 匹配所有 <tr> 标签
    const rowMatches = match.match(/<tr[\s\S]*?<\/tr>/gi)
    if (!rowMatches || rowMatches.length === 0) return match

    const rows: string[][] = []
    let maxCols = 0

    for (const rowHtml of rowMatches) {
      const cellMatches = rowHtml.match(/<(td|th)[\s\S]*?>([\s\S]*?)<\/(td|th)>/gi)
      if (!cellMatches) continue

      const rowCells: string[] = []
      for (const cellHtml of cellMatches) {
        // 提取单元格内部文本
        const textMatch = cellHtml.match(/<(td|th)[\s\S]*?>([\s\S]*?)<\/(td|th)>/i)
        let cellText = textMatch ? textMatch[2] : ""

        // 处理换行符 <br>
        cellText = cellText.replace(/<br\s*\/?>/gi, " ")
        // 剥离内部其他 HTML 标签
        cellText = cellText.replace(/<[^>]+>/g, "")
        // 转义或清洗 | 字符
        cellText = cellText.replace(/\|/g, "\\|").trim()

        rowCells.push(cellText)
      }

      if (rowCells.length > maxCols) {
        maxCols = rowCells.length
      }
      rows.push(rowCells)
    }

    if (rows.length === 0 || maxCols === 0) return match

    const lines: string[] = []

    // 1. 表头行（第 0 行）
    const headerRow = rows[0]
    while (headerRow.length < maxCols) headerRow.push("")
    lines.push("| " + headerRow.join(" | ") + " |")

    // 2. 分隔线
    const separatorRow = Array(maxCols).fill("---")
    lines.push("| " + separatorRow.join(" | ") + " |")

    // 3. 数据行
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      while (row.length < maxCols) row.push("")
      lines.push("| " + row.join(" | ") + " |")
    }

    return "\n\n" + lines.join("\n") + "\n\n"
  })
}

/**
 * 保护公式内的管道符 |
 */
export function protectMathPipes(md: string): string {
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
 * CommonMark 规定 HTML 块会持续到遇到空行。如果 HTML 标签或表格行紧接图片/文本而没有空行，
 * 会被吞入 HTML 块。本函数补上必要的空行。
 */
export function ensureBlankLineAfterHtmlBlock(md: string): string {
  return md
    .replace(/(<\/\w+>[ \t]*)\n(?!\n)/g, "$1\n\n")
    .replace(/(\|[ \t]*)\n(!\[)/g, "$1\n\n$2")
}

/**
 * 预处理传入 Plate 编辑器的 Markdown 文本
 */
export function preprocessMarkdownForEditor(md: string): string {
  if (!md) return ""

  // 1. HTML 表格转 Markdown 表格
  let processed = convertHtmlTablesToMarkdown(md)

  // 2. 保护数学公式中的 | 符号
  processed = protectMathPipes(processed)

  // 3. 补齐闭合 HTML 标签/表格后的空行
  processed = ensureBlankLineAfterHtmlBlock(processed)

  return processed
}
