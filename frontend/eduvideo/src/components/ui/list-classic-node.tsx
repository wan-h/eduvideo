"use client"

import { cn } from "@/utils/cn"
import { PlateElement, type PlateElementProps } from "platejs/react"

export function BulletedListElement({
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="ul"
      className={cn("my-1 ml-6 list-disc", className)}
      {...props}
    />
  )
}

export function NumberedListElement({
  className,
  ...props
}: PlateElementProps) {
  return (
    <PlateElement
      as="ol"
      className={cn("my-1 ml-6 list-decimal", className)}
      {...props}
    />
  )
}

export function ListItemElement({ className, ...props }: PlateElementProps) {
  return <PlateElement as="li" className={cn("", className)} {...props} />
}

export function ListItemContentElement({
  className,
  ...props
}: PlateElementProps) {
  return <PlateElement as="div" className={cn("", className)} {...props} />
}
