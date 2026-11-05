"use client"

import { MarkdownPlugin } from "@platejs/markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

/**
 * Markdown 序列化/反序列化插件
 * - remarkMath: 支持 $...$ 行内数学公式和 $$...$$ 块级公式
 * - remarkGfm: 支持 GitHub Flavored Markdown（表格、删除线、任务列表等）
 */
export const MarkdownKit = [
  MarkdownPlugin.configure({
    options: {
      remarkPlugins: [remarkMath, remarkGfm],
    },
  }),
]
