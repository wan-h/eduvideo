"use client"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDownIcon, PlusIcon } from "lucide-react"
import { useState } from "react"

interface AddButtonGroupProps {
  /** aria-label 文案 */
  ariaLabel: string
  /** 是否展示右侧下拉按钮，默认 true */
  showDropdown?: boolean
  /** 主按钮点击回调（无下拉时） */
  onMainClick?: () => void
  /** 在上方插入回调 */
  onAddAbove?: () => void
  /** 在下方插入回调 */
  onAddBelow?: () => void
}

/**
 * 添加按钮组合组件
 *
 * 功能：
 * - 左侧主添加按钮（PlusIcon）
 * - 右侧下拉按钮（ChevronDownIcon），可选
 * - 下拉菜单提供"在上方插入"和"在下方插入"选项
 */
export function AddButtonGroup({
  ariaLabel,
  showDropdown = true,
  onMainClick,
  onAddAbove,
  onAddBelow,
}: AddButtonGroupProps) {
  const [openAddMenu, setOpenAddMenu] = useState(false)

  const handleMainClick = () => {
    if (showDropdown && onMainClick) {
      onMainClick()
    } else if (!showDropdown && onAddAbove) {
      onAddAbove()
    } else if (!showDropdown) {
      setOpenAddMenu(true)
    }
  }

  return (
    <ButtonGroup>
      <Button
        variant="ghost"
        size="icon-sm"
        className="hover:bg-brand/10 hover:text-brand data-[orientation=horizontal]:rounded-r-md"
        aria-label={ariaLabel}
        onClick={handleMainClick}
      >
        <PlusIcon className="size-4" />
      </Button>

      {showDropdown && (
        <DropdownMenu open={openAddMenu} onOpenChange={setOpenAddMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-brand/10 hover:text-brand data-[orientation=horizontal]:rounded-l-md"
              aria-label={`${ariaLabel}选项`}
            >
              <ChevronDownIcon className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem
              onSelect={() => {
                onAddAbove?.()
                setOpenAddMenu(false)
              }}
            >
              在上方插入
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                onAddBelow?.()
                setOpenAddMenu(false)
              }}
            >
              在下方插入
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ButtonGroup>
  )
}
