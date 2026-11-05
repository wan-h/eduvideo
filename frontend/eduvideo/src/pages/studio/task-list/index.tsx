import { deleteQuestionExtract } from "@/api/eduai/question-extract"
import type { QuestionExtractConfirmInfo } from "@/api/eduai/question-extract.types"
import { deleteScriptTask } from "@/api/eduai/script"
import { deleteFolder } from "@/api/eduai/workspace"
import { AppHeader } from "@/components/app-header"
import { TablePagination } from "@/components/table-pagination"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DeleteConfirmDialog } from "@/components/video/components/delete-confirm-dialog"
import { queryKeys } from "@/services/query-client"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { ConfirmExtractDialog } from "./components/confirm-extract-dialog"
import { CreateFolderDialog } from "./components/create-folder-dialog"
import { MoveToFolderDialog } from "./components/move-to-folder-dialog"
import { PendingConfirmList } from "./components/pending-confirm-list"
import { WorkspaceGrid } from "./components/workspace-grid"
import { WorkspaceHeader } from "./components/workspace-header"
import { WorkspaceSidebar } from "./components/workspace-sidebar"
import { PAGE_SIZE } from "./constants"
import { usePendingConfirms } from "./hooks/use-pending-confirms"
import { useWorkspace } from "./hooks/use-workspace"

export function TaskListPanel() {
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string[]>([])
  const [deleteAll, setDeleteAll] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [moveScriptIds, setMoveScriptIds] = useState<string[] | null>(null)
  const [batchMoveConfirmOpen, setBatchMoveConfirmOpen] = useState(false)
  const [pendingBatchMoveIds, setPendingBatchMoveIds] = useState<string[]>([])
  const [pendingFolderCount, setPendingFolderCount] = useState(0)
  const [deleteIsFolder, setDeleteIsFolder] = useState(false)

  const queryClient = useQueryClient()

  const {
    items,
    total,
    isInitialLoading,
    isRefetching,
    isPlaceholderData,
    pageIndex,
    setPageIndex,
    pageSize,
    refresh,
    folderId,
    folderName,
    search,
    setSearch,
    navigateToFolder,
  } = useWorkspace(PAGE_SIZE)

  const folderIdSet = useMemo(
    () =>
      new Set(items.filter((i) => i.item_type === "folder").map((i) => i.id)),
    [items]
  )

  const hasFolderTarget = useMemo(
    () => deleteIsFolder || deleteTarget.some((id) => folderIdSet.has(id)),
    [deleteTarget, folderIdSet, deleteIsFolder]
  )

  const handleToggleSelectionMode = (enabled: boolean) => {
    setSelectionMode(enabled)
    if (!enabled) {
      setSelectedIds(new Set())
    }
  }

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleDelete = (id: string) => {
    setDeleteTarget([id])
    setDeleteAll(false)
    setDeleteDialogOpen(true)
  }

  const handleMove = (id: string) => {
    setMoveScriptIds([id])
  }

  const handleBatchMove = () => {
    if (selectedIds.size === 0) return

    const selectedScriptIds = items
      .filter((i) => selectedIds.has(i.id) && i.item_type === "script")
      .map((i) => i.id)
    const folderCount = selectedIds.size - selectedScriptIds.length

    if (selectedScriptIds.length === 0) {
      toast.warning("文件夹不支持移动")
      return
    }

    if (folderCount > 0) {
      setPendingBatchMoveIds(selectedScriptIds)
      setPendingFolderCount(folderCount)
      setBatchMoveConfirmOpen(true)
      return
    }

    setMoveScriptIds(selectedScriptIds)
  }

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return
    setDeleteTarget(Array.from(selectedIds))
    setDeleteAll(false)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    try {
      const ops: Promise<void>[] = []
      const deletingCurrentFolder = deleteIsFolder
        ? deleteTarget[0] === folderId
        : deleteTarget.some((id) => folderIdSet.has(id) && id === folderId)

      for (const id of deleteTarget) {
        if (deleteIsFolder || folderIdSet.has(id)) {
          ops.push(deleteFolder(id, deleteAll))
        } else {
          ops.push(deleteScriptTask(id))
        }
      }

      await Promise.all(ops)
      toast.success(
        deleteTarget.length === 1
          ? "删除成功"
          : `已删除 ${deleteTarget.length} 项`
      )
      setSelectedIds(new Set())
      // 删除后同步失效首页最近任务列表缓存
      queryClient.invalidateQueries({ queryKey: queryKeys.scripts.all })

      // 删除了当前正在查看的工作空间 → 跳回根目录
      if (deletingCurrentFolder) {
        navigateToFolder(null)
      }

      await refresh()

      // 删除了文件夹 → 刷新侧边栏列表
      if (hasFolderTarget) {
        queryClient.invalidateQueries({ queryKey: queryKeys.folders.all })
      }
    } catch {
      // 错误由 error-toast-hook 自动处理
    } finally {
      setDeleteDialogOpen(false)
      setDeleteTarget([])
      setDeleteAll(false)
      setDeleteIsFolder(false)
    }
  }

  const [confirmItem, setConfirmItem] =
    useState<QuestionExtractConfirmInfo | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  const {
    items: pendingConfirms,
    isRefetching: isRefetchingConfirms,
    refresh: refreshConfirms,
  } = usePendingConfirms({ paused: confirmDialogOpen })

  // workspace 后台刷新完成 → 同步刷新待确认列表
  const prevIsRefetching = useRef(isRefetching)
  useEffect(() => {
    if (prevIsRefetching.current && !isRefetching) {
      refreshConfirms()
    }
    prevIsRefetching.current = isRefetching
  }, [isRefetching, refreshConfirms])

  const handleConfirmExtract = (id: string) => {
    const found = pendingConfirms.find((p) => p.id === id)
    if (found) {
      setConfirmItem(found)
      setConfirmDialogOpen(true)
    }
  }

  const handleDeleteExtract = async (id: string) => {
    try {
      await deleteQuestionExtract({ confirm_id: id })
      toast.success("已删除待确认题目")
      refreshConfirms()
    } catch {
      // 错误由 error-toast-hook 自动处理
    }
  }

  const isSingle = deleteTarget.length === 1

  const dialogTitle = isSingle
    ? hasFolderTarget
      ? "删除文件夹"
      : "删除任务"
    : `批量删除 ${deleteTarget.length} 项`

  const confirmLabel = hasFolderTarget && !deleteAll ? "解散文件夹" : "确认删除"

  const dialogDesc = isSingle
    ? hasFolderTarget
      ? "删除后无法恢复，请选择处理方式。"
      : "删除后无法恢复，是否确认？"
    : hasFolderTarget
      ? `已选 ${deleteTarget.length} 项（含文件夹），删除后无法恢复。`
      : `确认删除选中的 ${deleteTarget.length} 个任务？删除后无法恢复。`

  const handleSidebarDelete = (id: string) => {
    setDeleteIsFolder(true)
    handleDelete(id)
  }

  const handleSidebarCreate = () => {
    setCreateFolderOpen(true)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header — 下划线模式，与编辑脚本详情一致 */}
      <AppHeader variant="compact" />

      {/* 主体：侧边栏 + 内容区 */}
      <div className="flex min-h-0 flex-1 pt-12">
        <WorkspaceSidebar
          currentFolderId={folderId}
          onFolderSelect={navigateToFolder}
          onCreateFolder={handleSidebarCreate}
          onDeleteFolder={handleSidebarDelete}
        />

        {/* 内容区 */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          <div className="3xl:max-w-[125rem] mx-auto w-full space-y-4 xl:max-w-7xl 2xl:max-w-[80rem]">
            {/* 待确认列表 — 全局展示 */}
            <PendingConfirmList
              items={pendingConfirms}
              onConfirm={handleConfirmExtract}
              onDelete={handleDeleteExtract}
              onRefresh={refreshConfirms}
              isRefetching={isRefetchingConfirms}
              className="mb-8"
            />

            <WorkspaceHeader
              folderId={folderId}
              folderName={folderName}
              total={total}
              search={search}
              onSearch={setSearch}
              selectionMode={selectionMode}
              onToggleSelectionMode={handleToggleSelectionMode}
              selectedCount={selectedIds.size}
              onBatchMove={handleBatchMove}
              onBatchDelete={handleBatchDelete}
              onRefresh={refresh}
              isRefetching={isRefetching}
            />

            {isInitialLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-lg border bg-muted"
                  />
                ))}
              </div>
            ) : (
              <WorkspaceGrid
                items={items}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onMove={handleMove}
                onRefresh={refresh}
                isPlaceholderData={isPlaceholderData}
              />
            )}

            <TablePagination
              pageIndex={pageIndex}
              pageSize={pageSize}
              total={total}
              onPageChange={setPageIndex}
              loading={isRefetching}
            />
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={dialogTitle}
        description={dialogDesc}
        confirmLabel={confirmLabel}
      >
        {hasFolderTarget && (
          <div className="flex items-center gap-2 px-1 pb-2">
            <Checkbox
              id="delete-all"
              className="data-checked:border-brand data-checked:bg-brand data-checked:text-brand-foreground"
              checked={deleteAll}
              onCheckedChange={(v) => setDeleteAll(!!v)}
            />
            <Label htmlFor="delete-all" className="cursor-pointer text-sm">
              同时删除文件夹内所有内容
            </Label>
          </div>
        )}
      </DeleteConfirmDialog>

      <Dialog
        open={batchMoveConfirmOpen}
        onOpenChange={setBatchMoveConfirmOpen}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>无法移动文件夹</DialogTitle>
            <DialogDescription>
              已选的 {pendingFolderCount} 个文件夹不支持移动。是否仅移动其中{" "}
              {pendingBatchMoveIds.length} 个脚本？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchMoveConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                setBatchMoveConfirmOpen(false)
                setMoveScriptIds(pendingBatchMoveIds)
              }}
            >
              移动 {pendingBatchMoveIds.length} 个脚本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreated={() => {
          refresh()
          queryClient.invalidateQueries({ queryKey: queryKeys.folders.all })
        }}
      />

      <MoveToFolderDialog
        open={moveScriptIds !== null}
        onOpenChange={(open) => {
          if (!open) setMoveScriptIds(null)
        }}
        scriptIds={moveScriptIds ?? []}
        currentFolderId={folderId}
        onMoved={() => {
          setSelectedIds(new Set())
          refresh()
          queryClient.invalidateQueries({ queryKey: queryKeys.folders.all })
        }}
      />

      <ConfirmExtractDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        item={confirmItem}
        currentFolderId={folderId}
        currentFolderName={folderName}
        onConfirmed={() => {
          refreshConfirms()
          refresh()
        }}
      />
    </div>
  )
}
