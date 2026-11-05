"use client"

import * as React from "react"

import { TablePlugin, useTableMergeState } from "@platejs/table/react"
import { Grid3X3, Table } from "lucide-react"
import { KEYS } from "platejs"
import { useEditorPlugin, useEditorSelector } from "platejs/react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToolbarButton } from "@/components/ui/toolbar"

// ——————————————————————————————————————————
// 8×8 网格选择器
// ——————————————————————————————————————————
function TablePicker({ onClose }: { onClose: () => void }) {
  const { editor, tf } = useEditorPlugin(TablePlugin)

  const [size, setSize] = React.useState({ rowCount: 0, colCount: 0 })
  const [grid] = React.useState(() =>
    Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => 0))
  )

  const [highlightedGrid, setHighlightedGrid] = React.useState(grid)

  const onCellMove = (rowIndex: number, colIndex: number) => {
    const newGrid = grid.map((row, i) =>
      row.map((_, j) => (i <= rowIndex && j <= colIndex ? 1 : 0))
    )
    setHighlightedGrid(newGrid)
    setSize({ rowCount: rowIndex + 1, colCount: colIndex + 1 })
  }

  const onSelect = () => {
    if (size.rowCount > 0 && size.colCount > 0) {
      tf.insert.table(size, { select: true })
      // 在表格后插入空段落
      const tableEntry = editor.api.above({ match: { type: KEYS.table } })
      if (tableEntry) {
        const [, tablePath] = tableEntry
        const nextIndex = tablePath[tablePath.length - 1] + 1
        const nextPath = [...tablePath.slice(0, -1), nextIndex]
        editor.tf.insertNodes([{ type: KEYS.p, children: [{ text: "" }] }], {
          at: nextPath,
        })
      }
      editor.tf.focus()
      onClose()
    }
  }

  return (
    <div className="p-1">
      <div
        className="grid cursor-pointer grid-cols-8 gap-0.5"
        onClick={onSelect}
      >
        {highlightedGrid.map((rows, rowIndex) =>
          rows.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`size-4 rounded-sm border border-solid transition-colors ${
                cell ? "border-brand bg-brand/30" : "border-border bg-secondary"
              }`}
              onMouseEnter={() => onCellMove(rowIndex, colIndex)}
            />
          ))
        )}
      </div>
      <div className="mt-1 text-center text-xs text-muted-foreground">
        {size.rowCount > 0 ? `${size.rowCount} × ${size.colCount}` : "选择大小"}
      </div>
    </div>
  )
}

// ——————————————————————————————————————————
// 表格工具栏按钮
// ——————————————————————————————————————————
export function TableToolbarButton() {
  const [open, setOpen] = React.useState(false)

  const tableSelected = useEditorSelector(
    (editor) => editor.api.some({ match: { type: KEYS.table } }),
    []
  )

  const { editor, tf } = useEditorPlugin(TablePlugin)
  const mergeState = useTableMergeState()

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip="表格" isDropdown>
          <Table className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {/* 插入表格（网格选择器） */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Grid3X3 className="size-4" />
            <span>插入表格</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="p-0">
            <TablePicker onClose={() => setOpen(false)} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* 单元格操作 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!tableSelected}>
            <span>单元格</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              disabled={!mergeState.canMerge}
              onSelect={() => tf.table.merge()}
            >
              合并单元格
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!mergeState.canSplit}
              onSelect={() => tf.table.split()}
            >
              拆分单元格
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 行操作 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!tableSelected}>
            <span>行</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() => tf.insert.tableRow({ before: true })}
            >
              在上方插入行
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => tf.insert.tableRow()}>
              在下方插入行
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => tf.remove.tableRow()}>
              删除行
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 列操作 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={!tableSelected}>
            <span>列</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onSelect={() => tf.insert.tableColumn({ before: true })}
            >
              在左侧插入列
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => tf.insert.tableColumn()}>
              在右侧插入列
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => tf.remove.tableColumn()}>
              删除列
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* 删除表格 */}
        <DropdownMenuItem
          disabled={!tableSelected}
          onSelect={() => {
            tf.remove.table()
            editor.tf.focus()
            setOpen(false)
          }}
        >
          删除表格
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
