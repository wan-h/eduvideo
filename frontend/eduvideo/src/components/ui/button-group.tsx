import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/utils/cn"

const buttonGroupVariants = cva("inline-flex items-stretch", {
  variants: {
    orientation: {
      horizontal:
        "flex-row [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none [&>button]:rounded-r-md",
      vertical:
        "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
})

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

export { ButtonGroup, buttonGroupVariants }
