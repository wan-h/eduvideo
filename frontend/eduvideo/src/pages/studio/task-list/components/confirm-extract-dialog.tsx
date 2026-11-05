import { confirmQuestionExtract } from "@/api/eduai/question-extract"
import type {
  ConfirmQuestionExtractReq,
  QuestionExtractConfirmInfo,
  QuestionInfo,
} from "@/api/eduai/question-extract.types"
import { getWorkspace } from "@/api/eduai/workspace"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import { PlateEditor } from "@/components/editor/plate-editor"
import { FolderSelectDialog } from "@/components/folder-select-dialog/folder-select-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils/cn"
import { MdRenderer } from "@ask2vid/shared"
import { format } from "date-fns"
import {
  Check,
  ChevronRight,
  FolderOpen,
  Info,
  Maximize2,
  Pencil,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { countQuestionTypes, deriveTaskName } from "../mock/pending-confirm"

interface ConfirmExtractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: QuestionExtractConfirmInfo | null
  /** 当前浏览的文件夹 ID，作为确认后的默认目标文件夹 */
  currentFolderId?: string | null
  /** 当前浏览的文件夹名称 */
  currentFolderName?: string
  onConfirmed: () => void
}

const TYPE_LABEL: Record<string, string> = {
  choice_question: "选择题",
  answer_question: "解答题",
}

/**
 * 转义行首 "数字. " 的点号为 "\."，防止被 Markdown 解析为有序列表。
 * 例如 "9. 正实数..." → "9\. 正实数..."
 * 使用 m 标志确保 ^ 匹配每行开头。
 */
function escapeLeadingNumberDot(content: string): string {
  return content.replace(/^(\d+)\. /gm, "$1\\. ")
}

/**
 * 反转义：将 "数字\. " 恢复为 "数字. "，用于保存时还原原始格式。
 */
function unescapeLeadingNumberDot(content: string): string {
  return content.replace(/^(\d+)\\. /gm, "$1. ")
}

function QuestionItem({
  q,
  index,
  checked,
  onToggle,
  editing,
  onStartEdit,
  editContent,
  onEditChange,
  onSaveEdit,
  onCancelEdit,
  editKey,
  onPreview,
}: {
  q: QuestionInfo
  index: number
  checked: boolean
  onToggle: (checked: boolean) => void
  editing: boolean
  onStartEdit: () => void
  editContent: string
  onEditChange: (v: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  editKey: number
  onPreview: (src: string) => void
}) {
  const qKey = index + 1
  const typeLabel = TYPE_LABEL[q.question_type] ?? q.question_type

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-4 transition-colors",
        !editing && "cursor-pointer",
        checked && "border-brand/30 bg-brand/[0.02]"
      )}
      onClick={() => {
        if (!editing) onToggle(!checked)
      }}
    >
      {/* Checkbox */}
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onToggle(!!v)}
        className="mt-0.5 shrink-0 data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground"
        aria-label={`选择题目 ${qKey}`}
      />

      {/* 内容区 */}
      <div className="min-w-0 flex-1 space-y-2">
        {/* 题号 + 类型 */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium tabular-nums">第 {qKey} 题</span>
          <span>·</span>
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 font-medium",
              q.question_type === "choice_question"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            )}
          >
            {typeLabel}
          </span>
        </div>

        {/* 内容：展示 / 编辑 */}
        {editing ? (
          <div className="space-y-2 bg-background">
            <PlateEditor
              key={`${index}-${editKey}`}
              initialValue={editContent}
              onChange={(md) => onEditChange(md)}
              placeholder="编辑题目内容..."
              imageMaxHeight="120px"
              fieldType="question_stem"
              allowedModes={["format_fix", "custom"]}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="brand"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onSaveEdit}
              >
                <Check className="size-3" />
                保存
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={onCancelEdit}
              >
                <X className="size-3" />
                取消
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="group/body relative min-h-20 cursor-text rounded-md transition-colors hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation()
              onStartEdit()
            }}
          >
            <MdRenderer
              content={escapeLeadingNumberDot(q.content)}
              fontSize={14}
              lineHeight={1.5}
              imageHeight={100}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/body:opacity-100">
              <div className="rounded-full bg-black/30 p-1.5">
                <Pencil className="size-4 text-white" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 图片 */}
      <div
        className="group/img relative w-[min(240px,30%)] shrink-0 cursor-pointer self-start"
        onClick={(e) => {
          e.stopPropagation()
          onPreview(q.image)
        }}
      >
        <img
          src={q.image}
          alt={`题目 ${qKey} 截图`}
          className="w-full rounded border bg-muted object-contain"
          style={{ aspectRatio: "4/3" }}
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 rounded bg-muted/60 opacity-0 transition-opacity group-hover/img:opacity-100" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover/img:opacity-100">
          <div className="rounded-full bg-black/30 p-1.5">
            <Maximize2 className="size-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ConfirmExtractDialog({
  open,
  onOpenChange,
  item,
  currentFolderId,
  currentFolderName,
  onConfirmed,
}: ConfirmExtractDialogProps) {
  // 可编辑的题目列表（深拷贝）
  const [questions, setQuestions] = useState<QuestionInfo[]>([])
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set())
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editKey, setEditKey] = useState(0)
  const [editContent, setEditContent] = useState("")
  const [selectedFolder, setSelectedFolder] =
    useState<WorkspaceFolderInfo | null>(null)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  // 预览时 Escape 关闭
  useEffect(() => {
    if (!previewSrc) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewSrc(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [previewSrc])

  // 弹窗打开时初始化（每次打开重新初始化）
  const prevOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current
    prevOpenRef.current = open
    if (!justOpened || !item) return
    const qs = item.questions.map((q) => ({ ...q }))
    setQuestions(qs)
    setCheckedSet(new Set())
    setEditingIdx(null)
    setEditKey(0)
    setSelectedFolder(null)
    setSubmitting(false)
    setPreviewSrc(null)
  }, [open, item])

  // 弹窗打开时根据 item.folder_id 解析目标文件夹（验证文件夹是否仍存在）
  useEffect(() => {
    if (!open || !item?.folder_id) return
    let cancelled = false

    getWorkspace({ folder_id: item.folder_id, limit: 1 })
      .then((data) => {
        if (cancelled) return
        setSelectedFolder({
          item_type: "folder",
          id: item.folder_id,
          name: data.folder_name || item.folder_id,
          created_at: "",
        })
      })
      .catch(() => {
        if (!cancelled) setSelectedFolder(null)
      })

    return () => {
      cancelled = true
    }
  }, [open, item?.folder_id])

  const handleToggle = useCallback((index: number, checked: boolean) => {
    setCheckedSet((prev) => {
      const next = new Set(prev)
      if (checked) next.add(index)
      else next.delete(index)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setCheckedSet((prev) => {
      if (prev.size === questions.length) return new Set()
      return new Set(questions.map((_, i) => i))
    })
  }, [questions])

  const selectAllState: boolean | "indeterminate" =
    questions.length === 0
      ? false
      : checkedSet.size === questions.length
        ? true
        : checkedSet.size === 0
          ? false
          : "indeterminate"

  const handleStartEdit = useCallback(
    (index: number) => {
      setEditingIdx(index)
      setEditKey((k) => k + 1)
      setEditContent(escapeLeadingNumberDot(questions[index]?.content ?? ""))
    },
    [questions]
  )

  const handleSaveEdit = useCallback(() => {
    if (editingIdx === null) return
    setQuestions((prev) => {
      const next = [...prev]
      next[editingIdx] = {
        ...next[editingIdx],
        content: unescapeLeadingNumberDot(editContent),
      }
      return next
    })
    setEditingIdx(null)
  }, [editingIdx, editContent])

  const handleCancelEdit = useCallback(() => {
    setEditingIdx(null)
  }, [])

  const handleSelectFolder = useCallback(
    (folder: WorkspaceFolderInfo | null) => {
      setSelectedFolder(folder)
      setFolderDialogOpen(false)
    },
    []
  )

  const handleConfirm = useCallback(async () => {
    if (!item) return
    const selectedQuestions = questions.filter((_, i) => checkedSet.has(i))
    if (selectedQuestions.length === 0) {
      toast.warning("请至少选择一道题目")
      return
    }

    const req: ConfirmQuestionExtractReq = {
      confirm_id: item.id,
      questions: selectedQuestions,
      folder_id: selectedFolder?.id ?? currentFolderId ?? undefined,
    }

    setSubmitting(true)
    try {
      await confirmQuestionExtract(req)
      toast.success(`已确认 ${selectedQuestions.length} 道题目`)
      onConfirmed()
      onOpenChange(false)
    } catch {
      // 错误由 error-toast-hook 自动处理
    } finally {
      setSubmitting(false)
    }
  }, [
    item,
    questions,
    checkedSet,
    selectedFolder,
    currentFolderId,
    onConfirmed,
    onOpenChange,
  ])

  if (!item) return null

  const { choice, answer } = countQuestionTypes(questions)
  const selectedCount = checkedSet.size
  const isEditing = editingIdx !== null
  const name = deriveTaskName(item)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] flex-col sm:max-w-5xl"
          onEscapeKeyDown={(e) => {
            if (previewSrc) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              确认题目提取
              <span className="text-sm font-normal text-muted-foreground">
                · {name}
              </span>
            </DialogTitle>

            {/* 摘要栏 */}
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-1.5">
                <Checkbox
                  checked={selectAllState}
                  onCheckedChange={handleToggleAll}
                  className="data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground"
                  aria-label={
                    selectAllState === true ? "取消全选" : "全选所有题目"
                  }
                />
                <span
                  className={cn(
                    "select-none",
                    selectAllState === true && "text-brand"
                  )}
                >
                  全选
                </span>
              </label>
              <span className="text-border">|</span>
              <span>
                共{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {questions.length}
                </span>{" "}
                道题
              </span>
              <span className="text-border">|</span>
              <span>
                已选{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {selectedCount}
                </span>{" "}
                道
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                选择题 {choice}
              </span>
              <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                解答题 {answer}
              </span>
              <span className="text-border">|</span>
              <span>
                {format(new Date(item.created_at), "yyyy/MM/dd HH:mm")}
              </span>
            </div>
          </DialogHeader>

          <div className="-mx-4">
            <Separator />
          </div>

          {/* 题目列表 */}
          <div className="-mr-4 flex-1 space-y-3 overflow-y-auto pr-4">
            {questions.map((q, i) => (
              <QuestionItem
                key={i}
                q={q}
                index={i}
                checked={checkedSet.has(i)}
                onToggle={(v) => handleToggle(i, v)}
                editing={editingIdx === i}
                onStartEdit={() => handleStartEdit(i)}
                editContent={editContent}
                onEditChange={setEditContent}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                editKey={editKey}
                onPreview={setPreviewSrc}
              />
            ))}
          </div>

          {/* 提交说明 */}
          <div className="flex items-center gap-2 rounded-lg bg-brand/5 px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0 text-brand" />
            <span>确认后将开始为选中的每道题目逐个生成视频脚本</span>
          </div>

          {/* 底部操作栏 */}
          <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>

              {/* 目标文件夹 */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setFolderDialogOpen(true)}
              >
                <FolderOpen className="size-3.5" />
                {selectedFolder
                  ? selectedFolder.name
                  : currentFolderId
                    ? currentFolderName || "当前文件夹"
                    : "选择目标文件夹"}
              </Button>
              {selectedFolder && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedFolder(null)}
                  aria-label="清除已选文件夹"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="brand"
              onClick={handleConfirm}
              disabled={submitting || selectedCount === 0 || isEditing}
              className="gap-1.5"
              title={isEditing ? "请先保存或取消编辑" : undefined}
            >
              {submitting
                ? "提交中..."
                : isEditing
                  ? "请先完成编辑"
                  : "确认提交"}
              {!submitting && !isEditing && selectedCount > 0 && (
                <span className="text-[11px] opacity-70">
                  ({selectedCount})
                </span>
              )}
              <ChevronRight className="size-3.5" />
            </Button>
          </DialogFooter>

          {/* 图片全屏预览 — dialog 内覆盖层 */}
          {previewSrc && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-black/80 p-8">
              <img
                src={previewSrc}
                alt="题目预览"
                className="max-h-[75vh] max-w-full rounded-lg object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => setPreviewSrc(null)}
              >
                <X className="size-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <FolderSelectDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onSelect={handleSelectFolder}
        showRootOption
      />
    </>
  )
}
