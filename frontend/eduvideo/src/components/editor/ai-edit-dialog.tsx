import * as React from "react"
import { MdRenderer } from "@ask2vid/shared"
import {
  Check,
  CheckCircle2,
  FileCode,
  Eye,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
  AlertCircle,
} from "lucide-react"

import { requestAIEditStream } from "@/api/eduai/ai-assist"
import type { AIEditData, FullContext } from "@/api/eduai/ai-assist.types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type EditMode = "format_fix" | "condense" | "logic_check" | "custom"

interface AIEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptTaskId?: string
  fieldType?: string
  initialContent: string
  selectedText?: string
  context?: FullContext
  allowedModes?: EditMode[]
  onApply: (newContent: string) => void
}

const MODE_OPTIONS: {
  id: EditMode
  label: string
  desc: string
  icon: string
}[] = [
  {
    id: "format_fix",
    label: "🛠️ 格式修复",
    desc: "修复 LaTeX 美元符号、表格对齐与转义规范",
    icon: "🛠️",
  },
  {
    id: "condense",
    label: "✂️ 内容精简",
    desc: "精简繁琐表达，提炼推导与思路核心要点",
    icon: "✂️",
  },
  {
    id: "logic_check",
    label: "🔍 逻辑纠错",
    desc: "核对全题步骤推导逻辑与数值计算准确性",
    icon: "🔍",
  },
  {
    id: "custom",
    label: "✨ 自定义指令",
    desc: "自由输入提示词（如：改为分步解题、增加推导说明）",
    icon: "✨",
  },
]

export function AIEditDialog({
  open,
  onOpenChange,
  scriptTaskId = "",
  fieldType = "step_breakdown",
  initialContent,
  selectedText = "",
  context,
  allowedModes,
  onApply,
}: AIEditDialogProps) {
  const availableModes = React.useMemo(() => {
    if (allowedModes && allowedModes.length > 0) {
      return MODE_OPTIONS.filter((opt) => allowedModes.includes(opt.id))
    }
    return MODE_OPTIONS
  }, [allowedModes])

  const initialMode = availableModes[0]?.id || "format_fix"
  const [mode, setMode] = React.useState<EditMode>(initialMode)
  const [customPrompt, setCustomPrompt] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<AIEditData | null>(null)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [viewTab, setViewTab] = React.useState<"render" | "diff">("render")

  const abortControllerRef = React.useRef<AbortController | null>(null)

  // 追踪 open 状态变化，避免在 useEffect 中同步 setState
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setResult(null)
      setErrorMsg("")
      setCustomPrompt("")
      setMode(initialMode)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setErrorMsg("")

    // 初始化流式响应体
    let currentSuggested = ""
    const currentSummary = "AI 正在实时思考生成中..."

    setResult({
      suggested_content: "",
      change_summary: currentSummary,
      syntax_valid: true,
      token_usage: { prompt_tokens: 0, completion_tokens: 0 },
    })

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      await requestAIEditStream(
        {
          script_task_id: scriptTaskId,
          field_type: fieldType,
          mode,
          custom_prompt: customPrompt,
          current_content: initialContent,
          selected_text: selectedText,
          context,
        },
        (chunk) => {
          if (chunk.type === "delta") {
            currentSuggested += chunk.content
            setResult((prev) => ({
              suggested_content: currentSuggested,
              change_summary: prev?.change_summary || "AI 正在实时思考生成中...",
              syntax_valid: prev?.syntax_valid ?? true,
              token_usage: prev?.token_usage ?? { prompt_tokens: 0, completion_tokens: 0 },
            }))
          } else if (chunk.type === "done") {
            setResult({
              suggested_content: chunk.suggested_content,
              change_summary: chunk.change_summary,
              syntax_valid: chunk.syntax_valid,
              token_usage: chunk.token_usage,
            })
          } else if (chunk.type === "error") {
            setErrorMsg(chunk.message)
          }
        },
        abortControllerRef.current.signal
      )
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        const message = err instanceof Error ? err.message : "AI 生成失败，请重试"
        setErrorMsg(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (result?.suggested_content) {
      onApply(result.suggested_content)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-4xl flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg">AI 编辑魔法棒</DialogTitle>
              <DialogDescription className="text-xs">
                针对当前字段结合全题上下文生成局部优化建议，确认后写入
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
          {/* 模式选择器 */}
          <div className="grid gap-2">
            <Label className="font-semibold text-xs text-muted-foreground">
              选择编辑模式
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableModes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`flex flex-col items-start justify-between rounded-lg border p-2.5 text-left transition-all ${
                    mode === item.id
                      ? "border-purple-500 bg-purple-50/60 ring-1 ring-purple-500 dark:bg-purple-950/30"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <span className="font-medium text-xs text-foreground">
                    {item.label}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义指令输入框 */}
          {mode === "custom" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">自定义指令 Prompt</Label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="请输入详细的要求，例如：'将重要逻辑结论加粗' 或 '统一换成分步行间公式'..."
                className="min-h-[60px] w-full rounded-md border border-input bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          )}

          {/* 生成动作按钮 */}
          {!result && (
            <div className="flex items-center justify-end">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="gap-2 bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    AI 正在分析推导与格式...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    生成 AI 修改建议
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 错误提示 */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600 text-xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI 结果预览对比面板 */}
          {result && (
            <div className="grid gap-3 border-t pt-3">
              {/* 顶部摘要信息 */}
              <div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2 text-xs dark:border-purple-950 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  {loading ? (
                    <Loader2 className="size-4 animate-spin text-purple-600" />
                  ) : (
                    <CheckCircle2 className="size-4 text-purple-600" />
                  )}
                  <span className="font-medium">{result.change_summary}</span>
                </div>
                {!result.syntax_valid && (
                  <span className="text-amber-600 text-[11px] font-medium">
                    ⚠️ 提示: 检测到可能未闭合的 LaTeX 美元符
                  </span>
                )}
              </div>

              {/* 当 AI 认为无需修改时的友好提示 */}
              {!loading && result.suggested_content.trim() === initialContent.trim() && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-blue-700 text-xs dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  <CheckCircle2 className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>经检查，当前内容已符合高标准规范，无需修改。</span>
                </div>
              )}

              {/* 预览切换页签 (渲染 vs 源码 Diff) */}
              <Tabs
                value={viewTab}
                onValueChange={(v) => setViewTab(v as "render" | "diff")}
                className="w-full"
              >
                <div className="flex items-center justify-between pb-2">
                  <TabsList className="h-8">
                    <TabsTrigger value="render" className="gap-1 text-xs">
                      <Eye className="size-3.5" /> 富文本渲染对比
                    </TabsTrigger>
                    <TabsTrigger value="diff" className="gap-1 text-xs">
                      <FileCode className="size-3.5" /> Markdown 源码对比
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleGenerate}
                    disabled={loading}
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" /> 重新生成
                  </Button>
                </div>

                {/* 富文本渲染对比 (Side-by-Side) */}
                <TabsContent value="render" className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col rounded-lg border bg-muted/20 p-3">
                      <span className="mb-2 font-semibold text-[11px] text-muted-foreground uppercase">
                        修改前 (Current)
                      </span>
                      <div className="max-h-[220px] overflow-y-auto rounded bg-background p-2 text-xs">
                        <MdRenderer content={initialContent || "(空)"} />
                      </div>
                    </div>
                    <div className="flex flex-col rounded-lg border border-purple-200 bg-purple-50/20 p-3 dark:border-purple-900/40">
                      <span className="mb-2 font-semibold text-[11px] text-purple-600 uppercase dark:text-purple-400">
                        AI 建议修改后 (Suggested)
                      </span>
                      <div className="max-h-[220px] overflow-y-auto rounded bg-background p-2 text-xs">
                        <MdRenderer content={result.suggested_content} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 源码 Markdown 对比 */}
                <TabsContent value="diff" className="mt-0">
                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="flex flex-col rounded-lg border bg-red-50/30 p-2.5 dark:bg-red-950/20">
                      <span className="mb-1 text-[11px] text-red-600">
                        原文 Markdown:
                      </span>
                      <pre className="max-h-[220px] whitespace-pre-wrap break-words text-red-900 text-xs dark:text-red-300">
                        {initialContent || "(空)"}
                      </pre>
                    </div>
                    <div className="flex flex-col rounded-lg border bg-green-50/30 p-2.5 dark:bg-green-950/20">
                      <span className="mb-1 text-[11px] text-green-600">
                        AI 建议 Markdown:
                      </span>
                      <pre className="max-h-[220px] whitespace-pre-wrap break-words text-green-900 text-xs dark:text-green-300">
                        {result.suggested_content}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <DialogFooter className="border-t pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            取消
          </Button>
          {result && (
            <Button
              onClick={handleApply}
              disabled={loading}
              size="sm"
              className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
            >
              <Check className="size-4" /> 确认应用修改 (Apply)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
