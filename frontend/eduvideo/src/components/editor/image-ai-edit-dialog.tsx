import * as React from "react"
import {
  Sparkles,
  Loader2,
  Wand2,
  Check,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react"

import { requestAIImageEdit } from "@/api/eduai/ai-assist"
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

interface ImageAIEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptTaskId?: string
  imageUrl: string
  onApply: (newImageUrl: string) => void
}

const QUICK_TAGS = [
  "🧹 擦除水印与手写笔迹",
  "✨ 提高清晰度与对比度",
  "🎨 调亮背景与色彩",
  "📐 重新绘制为高清风格",
]

export function ImageAIEditDialog({
  open,
  onOpenChange,
  scriptTaskId = "",
  imageUrl,
  onApply,
}: ImageAIEditDialogProps) {
  const [prompt, setPrompt] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [newImageUrl, setNewImageUrl] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState("")

  // Reset state when dialog opens
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setPrompt("")
      setNewImageUrl(null)
      setErrorMsg("")
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg("请输入修改指令")
      return
    }

    setLoading(true)
    setErrorMsg("")

    try {
      const res = await requestAIImageEdit({
        script_task_id: scriptTaskId,
        image_url: imageUrl,
        prompt: prompt.trim(),
      })
      setNewImageUrl(res.new_image_url)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI 图片编辑失败，请重试"
      setErrorMsg(message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (newImageUrl) {
      onApply(newImageUrl)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-3xl flex flex-col overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg">图片 AI 魔法棒</DialogTitle>
              <DialogDescription className="text-xs">
                通过自然语言描述修改要求，使用 AI 模型对选中图片进行智能处理
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid flex-1 gap-4 overflow-y-auto py-2 pr-1">
          {/* 选中的原图预览与修图后对比 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 原图 */}
            <div className="flex flex-col rounded-lg border bg-muted/20 p-2.5">
              <span className="mb-2 flex items-center gap-1 font-semibold text-[11px] text-muted-foreground uppercase">
                <ImageIcon className="size-3.5" /> 原图 (Original)
              </span>
              <div className="flex flex-1 items-center justify-center min-h-[160px] max-h-[220px] overflow-hidden rounded bg-background p-2 border">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Original"
                    className="max-h-[200px] w-auto object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">暂无图片</span>
                )}
              </div>
            </div>

            {/* 编辑后图片预览 */}
            <div className="flex flex-col rounded-lg border border-purple-200 bg-purple-50/20 p-2.5 dark:border-purple-900/40">
              <span className="mb-2 flex items-center gap-1 font-semibold text-[11px] text-purple-600 uppercase dark:text-purple-400">
                <Sparkles className="size-3.5" /> AI 编辑后 (Suggested)
              </span>
              <div className="flex flex-1 items-center justify-center min-h-[160px] max-h-[220px] overflow-hidden rounded bg-background p-2 border">
                {loading ? (
                  <div className="flex flex-col items-center gap-2 text-xs text-purple-600">
                    <Loader2 className="size-6 animate-spin" />
                    <span>AI 模型正在编辑处理图片中...</span>
                  </div>
                ) : newImageUrl ? (
                  <img
                    src={newImageUrl}
                    alt="AI Edited"
                    className="max-h-[200px] w-auto object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    输入修改指令后点击“生成 AI 编辑效果”
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 指令输入区 */}
          <div className="grid gap-2">
            <Label className="font-semibold text-xs text-foreground">
              修改指令 Prompt
            </Label>
            {/* 快捷 Tag 词条 */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setPrompt(tag.replace(/^[^\s]+\s*/, ""))}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="请输入图片修改指令，例如：'去除右下角的水印并提升清晰度' 或 '将插图重新绘制成简洁规范的科技风线框图'..."
              className="min-h-[70px] w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-600 text-xs dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            size="sm"
          >
            取消
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              size="sm"
              variant={newImageUrl ? "outline" : "default"}
              className={
                !newImageUrl
                  ? "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
                  : ""
              }
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  AI 生成中...
                </>
              ) : newImageUrl ? (
                <>
                  <RefreshCw className="size-3.5 mr-1.5" />
                  重新生成
                </>
              ) : (
                <>
                  <Wand2 className="size-3.5 mr-1.5" />
                  生成 AI 编辑效果
                </>
              )}
            </Button>

            {newImageUrl && (
              <Button
                onClick={handleApply}
                disabled={loading}
                size="sm"
                className="gap-1.5 bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                <Check className="size-4" /> 确认应用修改 (Apply)
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
