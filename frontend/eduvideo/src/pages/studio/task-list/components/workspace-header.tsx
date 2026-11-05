import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/utils/cn"
import {
  CheckSquare,
  FolderSync,
  RefreshCw,
  Search,
  Square,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface WorkspaceHeaderProps {
  folderId: string | null
  folderName: string
  total: number
  search: string
  onSearch: (s: string) => void
  selectionMode: boolean
  onToggleSelectionMode: (enabled: boolean) => void
  selectedCount: number
  onBatchMove: () => void
  onBatchDelete: () => void
  onRefresh: () => void
  isRefetching: boolean
}

export function WorkspaceHeader({
  folderId,
  folderName,
  total,
  search,
  onSearch,
  selectionMode,
  onToggleSelectionMode,
  selectedCount,
  onBatchMove,
  onBatchDelete,
  onRefresh,
  isRefetching,
}: WorkspaceHeaderProps) {
  const hasSelection = selectedCount > 0
  const title = folderId ? folderName || "..." : "根目录"

  const [inputValue, setInputValue] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const composingRef = useRef(false)

  // 同步外部 search → input value（处理浏览器前进后退）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 外部 URL 状态同步到本地输入
    setInputValue(search)
  }, [search])

  const flushSearch = useCallback(
    (value: string) => {
      onSearch(value.trim())
    },
    [onSearch]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInputValue(v)
      clearTimeout(debounceRef.current)
      if (composingRef.current) return
      debounceRef.current = setTimeout(() => flushSearch(v), 300)
    },
    [flushSearch]
  )

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false
      const v = (e.target as HTMLInputElement).value
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => flushSearch(v), 300)
    },
    [flushSearch]
  )

  // 清理 timer
  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleClear = useCallback(() => {
    setInputValue("")
    clearTimeout(debounceRef.current)
    flushSearch("")
  }, [flushSearch])

  const selectionLabel =
    selectionMode && hasSelection ? `已选择 ${selectedCount} 项` : "选择"

  return (
    <div className="flex items-center justify-between">
      {/* 左侧：标识 + 搜索 + 操作 */}
      <div className="flex items-center gap-2">
        {/* 标识区：title + count */}
        <span className="mr-1 text-sm font-semibold">{title}</span>

        {/* 搜索 */}
        <InputGroup className="w-52">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="搜索文件"
            value={inputValue}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          {inputValue && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton aria-label="清空搜索" onClick={handleClear}>
                <X className="size-3.5" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        {/* 选择切换 */}
        <Button
          variant={selectionMode ? "default" : "outline"}
          className={cn(
            "gap-1.5 transition-colors",
            selectionMode &&
              "border-brand bg-brand text-brand-foreground hover:bg-brand/90"
          )}
          onClick={() => onToggleSelectionMode(!selectionMode)}
        >
          {selectionMode ? (
            <CheckSquare className="size-4" />
          ) : (
            <Square className="size-4" />
          )}
          {selectionLabel}
        </Button>

        {/* 批量操作 — 有选中项时显示 */}
        <Button
          variant="outline"
          className={cn(
            "gap-1 transition-opacity",
            hasSelection ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onBatchMove}
        >
          <FolderSync className="size-3.5" />
          批量移动
        </Button>

        <Button
          variant="destructive"
          className={cn(
            "gap-1 transition-opacity",
            hasSelection ? "opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={onBatchDelete}
        >
          <Trash2 className="size-3.5" />
          批量删除
        </Button>
      </div>

      {/* 右侧：计数 + 刷新 */}
      <div className="flex items-center gap-3">
        {total !== undefined && (
          <span className="text-xs text-muted-foreground">
            共 {total} 个项目
          </span>
        )}
        <Button
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          onClick={onRefresh}
        >
          <RefreshCw
            className={cn("size-3.5", isRefetching && "animate-spin")}
          />
        </Button>
      </div>
    </div>
  )
}
