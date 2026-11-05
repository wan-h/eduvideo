import { renameFolder } from "@/api/eduai/workspace"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useIntersectionObserver } from "@/hooks/use-intersection-observer"
import { cn } from "@/utils/cn"
import {
  Folder,
  FolderClosed,
  FolderOpen,
  Home,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useFolderList } from "../hooks/use-folder-list"
import { useInlineRename } from "../hooks/use-inline-rename"

/** 硬编码根目录项 */
const ROOT_FOLDER: { id: null; name: "根目录" } = {
  id: null,
  name: "根目录",
}

interface WorkspaceSidebarProps {
  currentFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
  onDeleteFolder: (folderId: string) => void
}

export function WorkspaceSidebar({
  currentFolderId,
  onFolderSelect,
  onCreateFolder,
  onDeleteFolder,
}: WorkspaceSidebarProps) {
  const {
    folders,
    isLoading,
    isError,
    hasMore,
    search,
    setSearch,
    loadMore,
    refresh,
  } = useFolderList()

  const composingRef = useRef(false)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (composingRef.current) return
      setSearch(e.target.value.trim())
    },
    [setSearch]
  )

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false
      setSearch((e.target as HTMLInputElement).value.trim())
    },
    [setSearch]
  )

  const handleClear = useCallback(() => {
    setSearch("")
  }, [setSearch])

  const handleRename = useCallback(
    async (folderId: string, name: string) => {
      await renameFolder(folderId, { name })
      refresh()
    },
    [refresh]
  )

  // 无限滚动 sentinel
  const [sentinelRef, isIntersecting] = useIntersectionObserver()

  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading) {
      loadMore()
    }
  }, [isIntersecting, hasMore, isLoading, loadMore])

  return (
    <aside className="flex h-full min-h-0 w-[260px] shrink-0 flex-col border-r bg-background">
      {/* 搜索框 */}
      <div className="px-3 pt-3">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="搜索文件夹"
            value={search}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="清空搜索"
                onClick={handleClear}
                className="text-muted-foreground"
              >
                <X className="size-3.5" />
              </Button>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>

      {/* 标题行 */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-xs font-semibold text-muted-foreground">
          我的项目
        </span>
        <div className="flex items-center gap-0.5">
          {isLoading && (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onCreateFolder}
                aria-label="新建文件夹"
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>新建文件夹</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 列表区域 — 撑满剩余高度 */}
      <div className="flex-1 space-y-0.5 overflow-y-scroll px-1.5 pt-1">
        {/* 根目录 — 始终第一 */}
        <SidebarItem
          name={ROOT_FOLDER.name}
          icon={<Home className="size-4" />}
          isActive={currentFolderId === null}
          onClick={() => onFolderSelect(null)}
        />

        {/* 文件夹列表 */}
        {folders.map((folder) => {
          const hasItems = (folder.items_count ?? 0) > 0
          const active = currentFolderId === folder.id
          const icon = active ? (
            <FolderOpen className="size-4" />
          ) : hasItems ? (
            <FolderClosed className="size-4" />
          ) : (
            <Folder className="size-4" />
          )

          return (
            <SidebarItem
              key={folder.id}
              name={folder.name}
              icon={icon}
              count={folder.items_count}
              isActive={active}
              onClick={() => onFolderSelect(folder.id)}
              onDelete={() => onDeleteFolder(folder.id)}
              onRename={(name) => handleRename(folder.id, name)}
            />
          )
        })}

        {/* 搜索无结果 */}
        {!isLoading && folders.length === 0 && search && (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">
            未找到文件夹
          </p>
        )}

        {/* 错误 + 重试 */}
        {isError && (
          <button
            type="button"
            className="w-full px-3 py-4 text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={refresh}
          >
            加载失败，点击重试
          </button>
        )}

        {/* 无限滚动 sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Footer 预留 */}
      <div className="shrink-0 border-t px-3 py-2">
        <p className="text-[11px] text-muted-foreground/50">&nbsp;</p>
      </div>
    </aside>
  )
}

/* ── 内部子组件 ── */

interface SidebarItemProps {
  name: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  onDelete?: () => void
  onRename?: (name: string) => Promise<void>
  count?: number
}

function SidebarItem({
  name,
  icon,
  isActive,
  onClick,
  onDelete,
  onRename,
  count,
}: SidebarItemProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const {
    editing,
    editValue,
    isSaving,
    inputRef,
    containerRef,
    startEditing,
    handleKeyDown,
    setEditValue,
  } = useInlineRename({ onSave: onRename ?? (async () => {}) })

  const hasMenu = !!(onDelete || onRename)

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        "hover:bg-accent",
        isActive && !editing
          ? "bg-accent font-medium text-foreground"
          : editing
            ? "text-foreground"
            : "text-muted-foreground",
        // 下拉菜单打开时保持 hover 视觉状态
        dropdownOpen && "bg-accent"
      )}
      onClick={editing ? undefined : onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
    >
      <span
        className={cn(
          "shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {icon}
      </span>

      {editing ? (
        <input
          ref={inputRef}
          disabled={isSaving}
          className="min-w-0 flex-1 rounded border bg-background px-1.5 py-0.5 text-sm font-medium ring-1 ring-brand outline-none"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{name}</span>
      )}

      {!editing && ((count != null && count > 0) || hasMenu) && (
        <span className="ml-auto grid shrink-0 justify-items-end">
          {count != null && count > 0 && (
            <span
              className={cn(
                "col-start-1 row-start-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs text-muted-foreground",
                "pointer-events-none",
                "bg-accent",
                isActive && "bg-background",
                "group-hover:opacity-0"
              )}
            >
              {count}
            </span>
          )}
          {hasMenu && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className={cn(
                    "col-start-1 row-start-1 text-muted-foreground",
                    "opacity-0 group-hover:opacity-100",
                    "hover:bg-background data-[state=open]:bg-background",
                    "dark:hover:bg-background dark:data-[state=open]:bg-background",
                    dropdownOpen && "opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                {onRename && (
                  <DropdownMenuItem onClick={() => startEditing(name)}>
                    <Pencil className="size-4" />
                    重命名
                  </DropdownMenuItem>
                )}
                {onRename && onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </span>
      )}
    </div>
  )
}
