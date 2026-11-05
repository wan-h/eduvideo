import type { PlayerRef } from "@remotion/player"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useParams } from "react-router"

import { useInitTemplate } from "@/components/video/hooks/use-init-template"
import { useQuestionMetadataStore } from "@/components/video/store/question-metadata-store"
import { useSceneStore } from "@/components/video/store/scene-store"
import { useScriptTaskDetail } from "@/pages/studio/update/hooks/use-script-task-detail"
import { conversationStore } from "@/store/conversation-store"
import { useRenderSettingsStore } from "@/store/render-settings-store"
import { dataToFe } from "@ask2vid/shared"

import { ErrorPage } from "@/components/error/error-page"
import { Loader2 } from "lucide-react"
import { ConversationChat } from "./components/conversation-chat"
import { ConversationList } from "./components/conversation-list"
import { ShareHeader } from "./components/share-header"
import { ShareLayout } from "./components/share-layout"
import { SharePlayer } from "./share-player"

export function SharePage() {
  const { id: taskId } = useParams<{ id: string }>()
  const { data, isLoading, error } = useScriptTaskDetail(taskId)
  const playerRef = useRef<PlayerRef | null>(null)

  // 数据就绪后初始化 store
  useEffect(() => {
    if (!data) return
    const fe = dataToFe(data)
    useSceneStore.getState().initialize(fe.scenes)
    useQuestionMetadataStore
      .getState()
      .initialize(fe.questionMetadata, fe.questionContent)
  }, [data])

  // 根据 video_synthesis_template_id 初始化模板
  const { ready: templateReady } = useInitTemplate(data)

  const scenes = useSceneStore((s) => s.scenes)
  const metadata = useQuestionMetadataStore((s) => s.metadata)
  const fps = useRenderSettingsStore((s) => s.fps)

  const handleSessionCreated = useCallback(
    async (sessionId: string) => {
      await conversationStore.getState().loadSessions(taskId!)
      conversationStore.getState().setCurrentSessionId(sessionId)
    },
    [taskId]
  )

  // 计算视频总帧数
  const totalDurationFrames = useMemo(() => {
    if (scenes.length === 0) return 0
    const totalMs = scenes
      .flatMap((scene) => scene.segments.flatMap((seg) => seg.subtitles))
      .reduce((sum, sub) => sum + sub.duration, 0)
    return Math.ceil((totalMs / 1000) * fps)
  }, [scenes, fps])

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col pt-12">
        <ShareHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    const is404 =
      error?.message?.includes("status code 404") ??
      (error as { response?: { status?: number } })?.response?.status === 404

    return (
      <div className="flex h-screen flex-col pt-12">
        <ShareHeader />
        <ErrorPage
          title={is404 ? "未找到该视频" : "视频数据加载失败"}
          description={
            is404
              ? "该视频可能已被删除或链接无效，请检查链接是否正确"
              : (error?.message ?? "视频数据加载失败，请检查链接是否正确")
          }
        />
      </div>
    )
  }

  // store 和模板就绪前不渲染播放器，避免闪烁
  if (scenes.length === 0 || !templateReady) {
    return (
      <div className="flex h-screen flex-col pt-12">
        <ShareHeader />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col pt-12">
      <ShareHeader />
      <ShareLayout
        leftSidebar={<ConversationList scriptTaskId={taskId!} />}
        content={
          <SharePlayer
            durationInFrames={totalDurationFrames}
            scenes={scenes}
            playerRef={playerRef}
            title={metadata?.title}
          />
        }
        rightSidebar={
          <ConversationChat
            scriptTaskId={taskId!}
            playerRef={playerRef}
            scenes={scenes}
            fps={fps}
            onSessionCreated={handleSessionCreated}
          />
        }
      />
    </div>
  )
}
