/**
 * 将 markdown 文本转为纯文本，用于 @remotion/layout-utils 文本测量。
 * 保留段落结构（\n\n），抹除所有格式化语法。
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "") // 图片
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1") // 链接
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 粗体 **
    .replace(/__([^_]+)__/g, "$1") // 粗体 __
    .replace(/\*([^*]+)\*/g, "$1") // 斜体 *
    .replace(/_([^_]+)_/g, "$1") // 斜体 _
    .replace(/~~([^~]+)~~/g, "$1") // 删除线
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/^#{1,6}\s/gm, "") // 标题 #
    .replace(/^>\s?/gm, "") // 引用 >
    .replace(/^\s*[-*+]\s/gm, "") // 无序列表
    .replace(/^\d+\.\s/gm, "") // 有序列表
    .replace(/\$\$[\s\S]*?\$\$/g, "") // 块级公式
    .replace(/\$([^$]+)\$/g, "$1") // 行内公式
    .replace(/\n{3,}/g, "\n\n") // 归一化空行
    .trim()
}
