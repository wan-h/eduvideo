"use client"

import * as React from "react"

import {
  useListToolbarButton,
  useListToolbarButtonState,
} from "@platejs/list-classic/react"

import { ToolbarButton } from "@/components/ui/toolbar"

export function ListToolbarButton({
  nodeType,
  ...props
}: React.ComponentProps<typeof ToolbarButton> & {
  nodeType: "ul" | "ol"
}) {
  const state = useListToolbarButtonState({ nodeType })
  const { props: buttonProps } = useListToolbarButton(state)

  return <ToolbarButton {...props} {...buttonProps} />
}
