"use client"

import type { TImageElement } from "platejs"
import type { PlateElementProps } from "platejs/react"

import { useMediaState } from "@platejs/media/react"
import { Sparkles, X } from "lucide-react"
import { PlateElement, useEditorRef, useElement } from "platejs/react"
import { useContext, useState } from "react"

import { ImageAIEditDialog } from "@/components/editor/image-ai-edit-dialog"
import { ImageMaxHeightContext } from "@/components/editor/plugins/media-kit"
import { cn } from "@/utils/cn"

export function ImageElement(props: PlateElementProps<TImageElement>) {
  const editor = useEditorRef()
  const element = useElement<TImageElement>()
  const { focused, selected } = useMediaState()
  const imageMaxHeight = useContext(ImageMaxHeightContext)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)

  const handleDelete = () => {
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.removeNodes({ at: path })
    }
  }

  const handleApplyAIEdit = (newUrl: string) => {
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ url: newUrl }, { at: path })
    }
  }

  return (
    <PlateElement {...props} className="py-2.5">
      <div className="group relative" contentEditable={false}>
        <img
          src={element.url}
          alt={(props.attributes.alt as string | undefined) ?? ""}
          className={cn(
            "block max-w-full rounded-lg transition-shadow",
            focused && selected && "ring-2 ring-ring ring-offset-2"
          )}
          style={{
            maxHeight: imageMaxHeight,
            objectFit: "contain",
            margin: "12px auto",
          }}
        />

        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setImageDialogOpen(true)}
            className="flex items-center gap-1 rounded-md bg-purple-600/90 px-2 py-1 text-xs font-medium text-white shadow hover:bg-purple-700"
            title="AI 编辑图片魔法棒"
          >
            <Sparkles className="size-3" />
            <span>AI 编辑</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="删除图片"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <ImageAIEditDialog
          open={imageDialogOpen}
          onOpenChange={setImageDialogOpen}
          imageUrl={element.url}
          onApply={handleApplyAIEdit}
        />
      </div>
    </PlateElement>
  )
}

