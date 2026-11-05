"use client"

import { ImagePlugin } from "@platejs/media/react"
import { PathApi } from "platejs"
import { ParagraphPlugin } from "platejs/react"
import { createContext } from "react"

import { ImageElement } from "@/components/ui/media-image-node"

/** 编辑器内图片最大高度配置，默认 "30vh" */
export const ImageMaxHeightContext = createContext<string>("30vh")

export const MediaKit = [
  ImagePlugin.configure({
    options: { disableUploadInsert: true },
    render: { node: ImageElement },
    handlers: {
      onKeyDown: ({ editor, event }) => {
        if (event.key === "Enter") {
          event.preventDefault()
          const nodeEntry = editor.api.node({ block: true })
          if (nodeEntry) {
            const [, path] = nodeEntry
            editor.tf.insertNodes(
              { type: ParagraphPlugin.key, children: [{ text: "" }] },
              { at: PathApi.next(path), select: true }
            )
          }
          return true
        }
      },
    },
  }),
]
