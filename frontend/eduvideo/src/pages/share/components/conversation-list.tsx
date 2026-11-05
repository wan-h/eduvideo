import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useConversationStore } from "@/store/conversation-store"
import { cn } from "@/utils/cn"
import { groupSessionsByTime } from "@/utils/group-sessions"
import {
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useConversationList } from "../hooks/use-conversation-list"
import { useCollapseLeft } from "./share-layout"
import { useLanguage } from "@/i18n/language-provider"

interface ConversationListProps {
  scriptTaskId: string
}

export function ConversationList({ scriptTaskId }: ConversationListProps) {
  const collapseLeft = useCollapseLeft()
  const { translate } = useLanguage()
  const sessions = useConversationStore((s) => s.sessions)
  const currentSessionId = useConversationStore((s) => s.currentSessionId)
  const setCurrentSessionId = useConversationStore((s) => s.setCurrentSessionId)
  const { isLoadingSessions, loadSessions, handleRename, handleDelete } =
    useConversationList(scriptTaskId)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const groupedSessions = useMemo(
    () => groupSessionsByTime(sessions),
    [sessions]
  )

  function openRename(sessionId: string, currentTitle: string) {
    setRenamingId(sessionId)
    setRenameValue(currentTitle || "")
  }

  async function confirmRename() {
    if (!renamingId || !renameValue.trim()) return
    await handleRename(renamingId, renameValue.trim())
    setRenamingId(null)
  }

  async function confirmDelete(sessionId: string) {
    await handleDelete(sessionId)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">会话列表</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={collapseLeft}
          title={translate("收起侧栏")}  
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2">
        <Button
          variant={"outline"}
          className="h-10 w-full justify-center gap-2 rounded-full text-sm"
          onClick={() => setCurrentSessionId(null)}
        >
          <MessageSquarePlus className="h-4 w-4" />
          开启新对话
        </Button>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {isLoadingSessions && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            暂无会话
          </div>
        ) : (
          groupedSessions.map(({ group, sessions: groupSessions }) => (
            <div key={group.key}>
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground/50">
                {group.label}
              </div>
              {groupSessions.map((session) => (
                <div
                  key={session.session_id}
                  className={cn(
                    "group mx-2 mb-1.5 flex cursor-pointer items-center rounded-lg px-2 py-2 transition-colors hover:bg-muted",
                    currentSessionId === session.session_id && "bg-brand/10"
                  )}
                  onClick={() => setCurrentSessionId(session.session_id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">
                      {session.title || "新会话"}
                    </div>
                  </div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openRename(session.session_id, session.title)
                        }}
                      >
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmDelete(session.session_id)
                        }}
                      >
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!renamingId}
        onOpenChange={(open) => {
          if (!open) setRenamingId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={translate("输入新名称")}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingId(null)}>
              取消
            </Button>
            <Button onClick={confirmRename}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
