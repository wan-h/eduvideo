import { Fragment } from "react"
import { Link } from "react-router"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/utils/cn"

export interface BreadcrumbItemConfig {
  label: string
  path?: string
}

interface BreadcrumbNavProps {
  items: BreadcrumbItemConfig[]
  className?: string
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <Breadcrumb className={cn("min-w-0", className)}>
      <BreadcrumbList className="flex-nowrap min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <Fragment key={item.label}>
              {i > 0 && <BreadcrumbSeparator className="shrink-0" />}
              <BreadcrumbItem
                className={cn("min-w-0", isLast ? "flex-1 shrink" : "shrink-0")}
              >
                {item.path ? (
                  <BreadcrumbLink
                    asChild
                    className="truncate max-w-[120px] sm:max-w-none"
                  >
                    <Link to={item.path}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className="truncate block min-w-0"
                    title={item.label}
                  >
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

