"use client"

import * as React from "react"

import { useEquationElement, useEquationInput } from "@platejs/math/react"
import type { TEquationElement } from "platejs"
import type { PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/utils/cn"

const EquationInput = ({
  isInline,
  open,
  onClose,
  className,
  ...props
}: React.ComponentProps<"textarea"> & {
  isInline?: boolean
  open?: boolean
  onClose?: () => void
}) => {
  const {
    props: inputProps,
    ref,
    onDismiss,
    onSubmit,
  } = useEquationInput({
    isInline,
    open,
    onClose,
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onDismiss()
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <textarea
      ref={ref}
      {...inputProps}
      {...props}
      className={cn(
        "max-h-[50vh] w-full resize-none border-none bg-transparent p-2 font-mono text-sm outline-none",
        className
      )}
      onKeyDown={handleKeyDown}
    />
  )
}

export function EquationElement(props: PlateElementProps<TEquationElement>) {
  const { element } = props
  const [open, setOpen] = React.useState(false)
  const katexRef = React.useRef<HTMLDivElement | null>(null)

  useEquationElement({
    element,
    katexRef,
    options: {
      displayMode: true,
      output: "htmlAndMathml",
      throwOnError: false,
      errorColor: "#cc0000",
      strict: "warn",
    },
  })

  return (
    <PlateElement className="my-1" {...props}>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "group flex cursor-pointer items-center justify-center rounded-sm px-2 py-1",
              "hover:bg-muted/50"
            )}
            contentEditable={false}
          >
            {element.texExpression.length > 0 ? (
              <span ref={katexRef} />
            ) : (
              <div className="text-sm text-muted-foreground">
                点击输入 LaTeX 公式...
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="flex w-[420px] gap-2 p-2"
          side="bottom"
          align="center"
        >
          <div className="flex flex-1 flex-col gap-2">
            <EquationInput
              isInline={false}
              open={open}
              onClose={() => setOpen(false)}
              placeholder="输入 LaTeX 公式，如: E = mc^2"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setOpen(false)}>
                完成
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div style={{ display: "none" }}>{props.children}</div>
    </PlateElement>
  )
}

export function InlineEquationElement(
  props: PlateElementProps<TEquationElement>
) {
  const { element } = props
  const [open, setOpen] = React.useState(false)
  const katexRef = React.useRef<HTMLDivElement | null>(null)

  useEquationElement({
    element,
    katexRef,
    options: {
      displayMode: false,
      output: "htmlAndMathml",
      throwOnError: false,
      errorColor: "#cc0000",
      strict: "warn",
    },
  })

  return (
    <PlateElement {...props} className="inline-block">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <span
            className="cursor-pointer rounded-sm px-0.5 hover:bg-muted/50"
            contentEditable={false}
          >
            <span
              ref={katexRef}
              className="font-mono leading-none"
              style={{ zoom: 0.9 }}
            />
            {element.texExpression.length === 0 && (
              <span className="text-xs text-muted-foreground">[公式]</span>
            )}
          </span>
        </PopoverTrigger>
        <PopoverContent
          className="flex w-[360px] gap-2 p-2"
          side="bottom"
          align="center"
        >
          <div className="flex flex-1 flex-col gap-2">
            <EquationInput
              isInline
              open={open}
              onClose={() => setOpen(false)}
              placeholder="E = mc^2"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setOpen(false)}>
                完成
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {props.children}
    </PlateElement>
  )
}
