"use client"

import { PlateEditor } from "@/components/editor"
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
import { PlusIcon, XIcon } from "lucide-react"
import { useState } from "react"

export interface SegmentEditDialogConfig {
  showTitle: boolean
  showOptions: boolean
  contentLabel: string
  description: string
}

export interface SegmentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scriptTaskId?: string
  initialData: {
    segmentId: string
    title: string
    content: string
    options?: string[]
  }
  config: SegmentEditDialogConfig
  onSave: (patch: {
    title: string
    content: string
    options?: string[]
  }) => void
}

export function SegmentEditDialog({
  open,
  onOpenChange,
  scriptTaskId = "",
  initialData,
  config,
  onSave,
}: SegmentEditDialogProps) {
  const [title, setTitle] = useState(initialData.title)
  const [content, setContent] = useState(initialData.content)
  const [options, setOptions] = useState<string[]>(initialData.options ?? [])

  const handleSave = () => {
    const patch: { title: string; content: string; options?: string[] } = {
      title,
      content,
    }

    if (config.showOptions) {
      patch.options = options.filter((o) => o.trim() !== "")
    }

    onSave(patch)
    onOpenChange(false)
  }

  const addOption = () => setOptions((prev) => [...prev, ""])

  const removeOption = (index: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== index))

  const updateOption = (index: number, value: string) =>
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>编辑内容</DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>
        <div
          key={initialData.segmentId}
          className="-mr-4 grid max-h-[70vh] gap-4 overflow-y-auto py-4 pr-4"
        >
          {config.showTitle && (
            <div className="grid gap-2">
              <Label>标题</Label>
              <PlateEditor
                initialValue={title}
                onChange={(md) => setTitle(md)}
                placeholder="输入标题..."
                fieldType="step_title"
                scriptTaskId={scriptTaskId}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>{config.contentLabel}</Label>
            <PlateEditor
              initialValue={content}
              onChange={(md) => setContent(md)}
              placeholder="输入内容..."
              showToolbar={true}
              fieldType="step_breakdown"
              scriptTaskId={scriptTaskId}
            />
          </div>
          {config.showOptions && (
            <div className="grid gap-2">
              <Label>选项</Label>
              <div className="grid grid-cols-2 gap-2">
                {options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-lg border p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <PlateEditor
                        key={`${initialData.segmentId}-option-${index}`}
                        initialValue={option}
                        onChange={(md) => updateOption(index, md)}
                        placeholder="输入选项内容..."
                        showToolbar={true}
                        fieldType="option"
                        scriptTaskId={scriptTaskId}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => removeOption(index)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="flex min-h-[80px] items-center justify-center border-dashed"
                  onClick={addOption}
                >
                  <PlusIcon className="mr-1 size-4" />
                  添加选项
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
