import * as React from "react"
import { MarkdownPlugin } from "@platejs/markdown"
import { List, ListOrdered } from "lucide-react"
import { Plate, usePlateEditor } from "platejs/react"

import type { FullContext } from "@/api/eduai/ai-assist.types"
import { AIEditDialog, type EditMode } from "@/components/editor/ai-edit-dialog"
import { AIWandButton } from "@/components/editor/ai-wand-button"
import { BasicMarksKit } from "@/components/editor/plugins/basic-marks-kit"
import { ListClassicKit } from "@/components/editor/plugins/list-classic-kit"
import { MarkdownKit } from "@/components/editor/plugins/markdown-kit"
import { MathKit } from "@/components/editor/plugins/math-kit"
import {
  ImageMaxHeightContext,
  MediaKit,
} from "@/components/editor/plugins/media-kit"
import { TableKit } from "@/components/editor/plugins/table-kit"
import { preprocessMarkdownForEditor } from "@/components/editor/utils/markdown-preprocessor"
import { Editor, EditorContainer } from "@/components/ui/editor"
import { EquationToolbarButton } from "@/components/ui/equation-toolbar-button"
import { FixedToolbar } from "@/components/ui/fixed-toolbar"
import { ImageToolbarButton } from "@/components/ui/image-toolbar-button"
import { ListToolbarButton } from "@/components/ui/list-toolbar-button"
import { MarkToolbarButton } from "@/components/ui/mark-toolbar-button"
import { TableToolbarButton } from "@/components/ui/table-toolbar-button"

interface PlateEditorProps {
  /** 初始 Markdown 字符串，仅挂载时生效（配合 key prop 刷新） */
  initialValue?: string
  /** 内容变更回调，返回序列化后的 Markdown 字符串 */
  onChange?: (markdown: string) => void
  placeholder?: string
  /** 关联的脚本任务 ID */
  scriptTaskId?: string
  /** 是否显示工具栏，默认 true */
  showToolbar?: boolean
  /** 编辑器内图片最大高度（CSS 值），默认 "30vh" */
  imageMaxHeight?: string
  /** 编辑字段类型: question_stem | step_title | step_breakdown | step_summary | option */
  fieldType?: string
  /** 题目全局上下文数据 */
  context?: FullContext
  /** 是否在底部工具栏显示 AI 魔法棒按钮，默认 true */
  showAIWand?: boolean
  /** 允许使用的 AI 编辑模式列表 */
  allowedModes?: EditMode[]
}

export function PlateEditor({
  initialValue = "",
  onChange,
  placeholder = "输入您精彩的内容...",
  scriptTaskId = "",
  showToolbar = true,
  imageMaxHeight = "30vh",
  fieldType = "step_breakdown",
  context,
  showAIWand = true,
  allowedModes,
}: PlateEditorProps) {
  const editor = usePlateEditor({
    plugins: [
      ...BasicMarksKit,
      ...ListClassicKit,
      ...MathKit,
      ...TableKit,
      ...MarkdownKit,
      ...MediaKit,
    ],
    value: (e) =>
      e
        .getApi(MarkdownPlugin)
        .markdown.deserialize(preprocessMarkdownForEditor(initialValue)),
  })

  const [aiDialogOpen, setAiDialogOpen] = React.useState(false)

  // 快捷键 ⌘+J / Ctrl+J 唤起 AI 编辑弹窗
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault()
        setAiDialogOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleApplyAIEdit = (suggestedMarkdown: string) => {
    try {
      const processed = preprocessMarkdownForEditor(suggestedMarkdown)
      const nodes = editor.getApi(MarkdownPlugin).markdown.deserialize(processed)
      editor.tf.setValue(nodes)
      onChange?.(suggestedMarkdown)
    } catch {
      onChange?.(suggestedMarkdown)
    }
  }

  return (
    <ImageMaxHeightContext.Provider value={imageMaxHeight}>
      <Plate
        editor={editor}
        onChange={() => {
          const rawMd = editor.api.markdown.serialize()
          const sanitizedMd = rawMd.replace(/\\\$/g, "$")
          onChange?.(sanitizedMd)
        }}
      >
        <div className="flex flex-col overflow-x-hidden">
          {showToolbar && (
            <FixedToolbar className="justify-start rounded-t-lg border">
              <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
                B
              </MarkToolbarButton>
              <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
                I
              </MarkToolbarButton>
              <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
                U
              </MarkToolbarButton>
              <ListToolbarButton nodeType="ul" tooltip="无序列表">
                <List className="size-4" />
              </ListToolbarButton>
              <ListToolbarButton nodeType="ol" tooltip="有序列表">
                <ListOrdered className="size-4" />
              </ListToolbarButton>
              <EquationToolbarButton />
              <TableToolbarButton />
              <ImageToolbarButton />
            </FixedToolbar>
          )}
          <EditorContainer
            variant="section"
            className={
              showToolbar
                ? "rounded-b-lg border-x border-b"
                : "rounded-lg border"
            }
          >
            <Editor variant="full" placeholder={placeholder} />

            {/* 底部工具条 — AI 编辑魔法棒 */}
            {showAIWand && (
              <div className="flex items-center justify-between border-t bg-muted/20 px-3 py-1.5 dark:bg-muted/10">
                <span className="text-[11px] text-muted-foreground">
                  支持 Markdown & KaTeX
                </span>
                <AIWandButton onClick={() => setAiDialogOpen(true)} />
              </div>
            )}
          </EditorContainer>

          <AIEditDialog
            open={aiDialogOpen}
            onOpenChange={setAiDialogOpen}
            scriptTaskId={scriptTaskId}
            fieldType={fieldType}
            initialContent={editor.api.markdown.serialize()}
            context={context}
            allowedModes={allowedModes}
            onApply={handleApplyAIEdit}
          />
        </div>
      </Plate>
    </ImageMaxHeightContext.Provider>
  )
}
