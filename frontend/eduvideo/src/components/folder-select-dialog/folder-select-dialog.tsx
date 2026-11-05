import { createFolder, getWorkspace } from "@/api/eduai/workspace"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import {
  CheckIcon,
  FolderOpenIcon,
  HomeIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export interface FolderSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (folder: WorkspaceFolderInfo | null) => void
  excludeFolderId?: string | null
  showRootOption?: boolean
}

export function FolderSelectDialog({
  open,
  onOpenChange,
  onSelect,
  excludeFolderId,
  showRootOption = false,
}: FolderSelectDialogProps) {
  const [folders, setFolders] = useState<WorkspaceFolderInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creating, setCreating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const composingRef = useRef(false)

  const fetchFolders = useCallback(
    async (fuzzySearch: string) => {
      setLoading(true)
      try {
        const data = await getWorkspace({
          item_type: "folder",
          fuzzy_search: fuzzySearch || undefined,
          limit: 100,
          offset: 0,
        })
        setFolders(
          (data?.items ?? []).filter(
            (item): item is WorkspaceFolderInfo =>
              item.item_type === "folder" && item.id !== excludeFolderId
          )
        )
      } catch {
        // 错误由 error-toast-hook 自动处理
      } finally {
        setLoading(false)
      }
    },
    [excludeFolderId]
  )

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dialog 打开时重置搜索并重新加载
      setSearch("")
      setIsCreating(false)
      setNewFolderName("")
      fetchFolders("")
    }
  }, [open, fetchFolders])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      clearTimeout(debounceRef.current)
      if (composingRef.current) return
      debounceRef.current = setTimeout(() => fetchFolders(value), 300)
    },
    [fetchFolders]
  )

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false
      const v = (e.target as HTMLInputElement).value
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchFolders(v), 300)
    },
    [fetchFolders]
  )

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  const handleSelectFolder = useCallback(
    (folder: WorkspaceFolderInfo | null) => {
      onSelect(folder)
    },
    [onSelect]
  )

  // ── 新建文件夹 ──

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setNewFolderName("")
  }, [])

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false)
    setNewFolderName("")
  }, [])

  const handleConfirmCreate = useCallback(async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) return
    setCreating(true)
    try {
      await createFolder({ name: trimmed })
      toast.success("文件夹已创建")
      setNewFolderName("")
      setIsCreating(false)
      // 刷新列表并自动选中新文件夹
      const data = await getWorkspace({
        item_type: "folder",
        limit: 100,
        offset: 0,
      })
      const items = (data?.items ?? []).filter(
        (item): item is WorkspaceFolderInfo =>
          item.item_type === "folder" && item.id !== excludeFolderId
      )
      setFolders(items)
      const created = items.find((f) => f.name === trimmed)
      if (created) {
        handleSelectFolder(created)
      }
    } catch {
      // 错误由 error-toast-hook 自动处理
    } finally {
      setCreating(false)
    }
  }, [newFolderName, excludeFolderId, handleSelectFolder])

  const handleCreateFromSearch = useCallback((name: string) => {
    setNewFolderName(name)
    setIsCreating(true)
  }, [])

  return (
    <CommandDialog
      title="选择文件夹"
      description="搜索并选择目标文件夹"
      dialogProps={{ open, onOpenChange }}
      commandProps={{ shouldFilter: false }}
    >
      <CommandInput
        placeholder="搜索文件夹..."
        value={search}
        onValueChange={handleSearchChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />
      <CommandList>
        {!isCreating && (
          <CommandEmpty>
            {loading ? (
              "加载中..."
            ) : search.trim() ? (
              <div
                className="cursor-pointer px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => handleCreateFromSearch(search.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    handleCreateFromSearch(search.trim())
                }}
                role="button"
                tabIndex={0}
              >
                创建文件夹「{search.trim()}」
              </div>
            ) : (
              "无匹配的文件夹"
            )}
          </CommandEmpty>
        )}
        <CommandGroup>
          {isCreating ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              <Input
                autoFocus
                className="h-7 flex-1 text-sm"
                placeholder="文件夹名称"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation()
                    handleConfirmCreate()
                  }
                  if (e.key === "Escape") handleCancelCreate()
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                disabled={!newFolderName.trim() || creating}
                onClick={handleConfirmCreate}
              >
                <CheckIcon className="size-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                onClick={handleCancelCreate}
              >
                <XIcon className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <CommandItem value="__new_folder__" onSelect={handleStartCreate}>
              <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
              <span>新建文件夹</span>
            </CommandItem>
          )}
          {showRootOption && (
            <CommandItem
              value="__root__"
              onSelect={() => handleSelectFolder(null)}
            >
              <HomeIcon className="size-4 shrink-0 text-muted-foreground" />
              <span>根目录</span>
            </CommandItem>
          )}
          {folders.map((folder) => (
            <CommandItem
              key={folder.id}
              value={folder.id}
              onSelect={() => handleSelectFolder(folder)}
            >
              <FolderOpenIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{folder.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
