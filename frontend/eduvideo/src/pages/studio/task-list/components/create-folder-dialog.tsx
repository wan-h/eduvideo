import { createFolder } from "@/api/eduai/workspace"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { toast } from "sonner"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      await createFolder({ name: trimmed })
      toast.success("文件夹已创建")
      setName("")
      onOpenChange(false)
      onCreated()
    } catch {
      // 错误由 error-toast-hook 自动处理
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>
            在根目录下创建文件夹，仅支持一级目录。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">文件夹名称</Label>
          <Input
            id="folder-name"
            placeholder="输入文件夹名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || submitting}>
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
