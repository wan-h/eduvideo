import type { PlayerRef } from "@remotion/player"
import { isEqual } from "lodash-es"
import { Share2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"

import { AppHeader } from "@/components/app-header"
import { BreadcrumbNav } from "@/components/breadcrumb-nav"
import { LoadingPage } from "@/components/loading-page"
import { Button } from "@/components/ui/button"
import {
  EditorContent,
  EditorLayout,
  EditorLeft,
  EditorRight,
} from "@/components/video"
import { RenderSettingsBar } from "@/components/video/components/render-settings-bar"
// import { SceneSegmentBar } from "@/components/video/components/scene-segment-bar"
import { TemplateBar } from "@/components/video/components/template/template-bar"
import { useTtsGenerationStore } from "@/components/video/hooks/tts-generation-store"
import { useInitTemplate } from "@/components/video/hooks/use-init-template"
import { useDirtyTracker } from "@/components/video/store/dirty-tracker"
import { useQuestionMetadataStore } from "@/components/video/store/question-metadata-store"
import { useSceneStore } from "@/components/video/store/scene-store"
import { useSegmentStore } from "@/components/video/store/segment-store"
import { useSubtitleStore } from "@/components/video/store/subtitle-store"
import { computeSceneFrameData } from "@/components/video/utils/scene-frame"
import {
  dataToFe,
  type FeQuestionContent,
  type FeQuestionMetadata,
  type FeScene,
} from "@ask2vid/shared"

import {
  DEFAULT_TEMPLATE_ID,
  toConfigFields,
  useRenderSettingsStore,
} from "@/store/render-settings-store"

import { updateBreadcrumbs } from "./breadcrumb-config"

import { usePlaybackSceneTracker } from "@/components/video/hooks/use-playback-scene"
import { usePlaybackSubtitleTracker } from "@/components/video/hooks/use-playback-subtitle"
import { computeSubtitleFrameMap } from "@/components/video/utils/scene-frame"

import { listExportTemplates } from "@/api/eduai/synthesis"
import type { TemplateInfo } from "@/api/eduai/synthesis.types"
import type { TemplateItemData } from "@/components/video/components/template/template-panel"

import { ExportButtons } from "./components/export-buttons"
import { SaveCancelButtons } from "./components/save-cancel-buttons"
import { ShareDialog } from "./components/share-dialog"
import { usePreloadAssets } from "./hooks/use-preload-assets"
import { useSaveScriptTask } from "./hooks/use-save-script-task"
import { useScriptTaskDetail } from "./hooks/use-script-task-detail"

/** 计算每个场景的起始帧号映射 */
function buildSceneStartFrameMap(
  scenes: FeScene[],
  fps: number
): Map<string, number> {
  const { sceneStartFrames } = computeSceneFrameData(scenes, fps)
  return new Map(scenes.map((scene, i) => [scene.id, sceneStartFrames[i]]))
}

/** 将 API 模板转为 VideoConfigFields */
export function StudioUpdate() {
  const scenes = useSceneStore((s) => s.scenes)
  const activeSceneId = useSceneStore((s) => s.activeSceneId)
  const setActiveScene = useSceneStore((s) => s.setActiveScene)
  const setSelectedSegment = useSceneStore((s) => s.setSelectedSegment)
  const setSelectedSubtitle = useSceneStore((s) => s.setSelectedSubtitle)
  const metadata = useQuestionMetadataStore((s) => s.metadata)
  const questionContent = useQuestionMetadataStore((s) => s.questionContent)
  const cleanSnapshot = useDirtyTracker((s) => s.cleanSnapshot)
  const renderFps = useRenderSettingsStore((s) => s.fps)
  const navigate = useNavigate()
  const { id: taskId } = useParams()

  const isDirty = useMemo(() => {
    if (!cleanSnapshot || !metadata || !questionContent) return false
    return !isEqual(
      { scenes, questionMetadata: metadata, questionContent },
      cleanSnapshot
    )
  }, [scenes, metadata, questionContent, cleanSnapshot])

  const videoData = useMemo(() => {
    if (!metadata || !questionContent) return null
    return { scenes, questionMetadata: metadata, questionContent }
  }, [scenes, metadata, questionContent])

  const { data, isLoading, error } = useScriptTaskDetail(taskId)
  const { save, isSaving } = useSaveScriptTask(taskId)
  const pendingAudioCount = useTtsGenerationStore((s) => s.pendingCount)

  // 模板数据
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [templatesReady, setTemplatesReady] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const activeTemplateId = useRenderSettingsStore((s) => s.activeTemplateId)

  useEffect(() => {
    listExportTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setTemplatesReady(true))
  }, [])

  // 卸载时重置 stores，防止旧脚本 dirty 数据泄漏到下一个脚本
  useEffect(() => {
    return () => {
      useSceneStore.getState().reset()
      useQuestionMetadataStore.getState().reset()
      useDirtyTracker
        .getState()
        .initialize(null as unknown as Record<string, unknown>)
      useTtsGenerationStore.getState().setCount(0)
      useSegmentStore.getState().setEditingSegment(false)
      useSubtitleStore.getState().setEditingSubtitle(null)
    }
  }, [])

  const refreshTemplates = useCallback(async () => {
    try {
      const result = await listExportTemplates()
      setTemplates(result)
    } catch {
      // 静默失败
    }
  }, [])

  const templateNames = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {
      [DEFAULT_TEMPLATE_ID]: "默认",
    }
    for (const tpl of templates) {
      map[tpl.id] = tpl.name
    }
    return map
  }, [templates])

  const activeTemplateName = useMemo(
    () => templateNames[activeTemplateId ?? ""] ?? "默认",
    [templateNames, activeTemplateId]
  )

  // 根据 video_synthesis_template_id 初始化模板
  const { ready: templateInited } = useInitTemplate(data, {
    templates,
    templatesReady,
    onAfterApply: () => {
      const currentScenes = useSceneStore.getState().scenes
      const currentMetadata = useQuestionMetadataStore.getState().metadata
      const currentContent = useQuestionMetadataStore.getState().questionContent
      if (currentMetadata && currentContent) {
        useDirtyTracker.getState().skipDirtyTracking({
          scenes: currentScenes,
          questionMetadata: currentMetadata,
          questionContent: currentContent,
        })
      }
    },
  })

  // 从 store 派生 initialTemplate，仅初始化后有效
  const initialTemplate = useMemo<TemplateItemData | null>(() => {
    if (!templateInited) return null
    if (!activeTemplateId || activeTemplateId === DEFAULT_TEMPLATE_ID)
      return null
    const tpl = templates.find((t) => t.id === activeTemplateId)
    if (!tpl) return null
    return {
      id: tpl.id,
      name: tpl.name,
      config: toConfigFields(tpl.template),
      isDefault: false,
    }
  }, [templateInited, activeTemplateId, templates])

  const playerRef = useRef<PlayerRef | null>(null)

  // 数据就绪后初始化 store
  useEffect(() => {
    if (!data) return
    const fe = dataToFe(data)
    useDirtyTracker.getState().initialize(fe)
    useSceneStore.getState().initialize(fe.scenes)
    useQuestionMetadataStore
      .getState()
      .initialize(fe.questionMetadata, fe.questionContent)
  }, [data])

  // TODO: 背景动态化时，从导出历史恢复背景设置
  // 数据就绪后预加载所有音频和图片
  usePreloadAssets(videoData)

  // 完整视频总帧数 = 所有场景帧数之和
  const totalDurationFrames = useMemo(() => {
    if (!videoData) return 0
    const totalMs = videoData.scenes
      .flatMap((scene) => scene.segments.flatMap((seg) => seg.subtitles))
      .reduce((sum, sub) => sum + sub.duration, 0)
    return Math.ceil((totalMs / 1000) * renderFps)
  }, [videoData, renderFps])

  const sceneStartFrameMap = useMemo(() => {
    if (!videoData) return new Map<string, number>()
    return buildSceneStartFrameMap(videoData.scenes, renderFps)
  }, [videoData, renderFps])

  const subtitleFrameMap = useMemo(() => {
    if (!videoData) return new Map()
    return computeSubtitleFrameMap(videoData.scenes, renderFps)
  }, [videoData, renderFps])

  const playbackSceneId = usePlaybackSceneTracker(playerRef, sceneStartFrameMap)

  // 播放中自动切换到对应 scene 时，同步更新左侧编辑器内容
  useEffect(() => {
    if (playbackSceneId && playbackSceneId !== activeSceneId) {
      setActiveScene(playbackSceneId)
    }
  }, [playbackSceneId, activeSceneId, setActiveScene])

  const playbackSubtitleInfo = usePlaybackSubtitleTracker(
    playerRef,
    subtitleFrameMap
  )

  // 播放中自动同步 segment 和 subtitle 选中状态
  useEffect(() => {
    if (playbackSubtitleInfo.segmentId) {
      setSelectedSegment(playbackSubtitleInfo.segmentId)
      setSelectedSubtitle(playbackSubtitleInfo.subtitleId)
    }
  }, [playbackSubtitleInfo, setSelectedSegment, setSelectedSubtitle])

  const reset = useCallback(() => {
    const cleanData = useDirtyTracker.getState().reset()
    if (cleanData) {
      const fe = cleanData as {
        scenes: FeScene[]
        questionMetadata: FeQuestionMetadata
        questionContent: FeQuestionContent
      }
      useSceneStore.getState().initialize(fe.scenes)
      useQuestionMetadataStore
        .getState()
        .initialize(fe.questionMetadata, fe.questionContent)
    }
  }, [])

  const handleApplyTemplate = useCallback(async () => {
    await save()
  }, [save])

  // loading / error / 未就绪状态 — 始终展示 AppHeader
  if (isLoading) {
    return (
      <>
        <AppHeader variant="compact" />
        <LoadingPage className="pt-12" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <AppHeader variant="compact" />
        <div className="flex h-dvh flex-col items-center justify-center gap-4 pt-12">
          <p className="text-destructive">{error.message}</p>
          <Button variant="outline" onClick={() => navigate("/studio")}>
            返回任务列表
          </Button>
        </div>
      </>
    )
  }

  if (!videoData) {
    return (
      <>
        <AppHeader variant="compact" />
        <div className="flex h-dvh items-center justify-center pt-12">
          <p className="text-muted-foreground">数据加载失败</p>
        </div>
      </>
    )
  }

  // const handleTabChange = (tabId: string) => {
  //   setActiveScene(tabId)
  //   const startFrame = sceneStartFrameMap.get(tabId) ?? 0
  //   const wasPlaying = playerRef.current?.isPlaying() ?? false
  //   playerRef.current?.pause()
  //   playerRef.current?.seekTo(startFrame)
  //   if (wasPlaying) {
  //     playerRef.current?.play()
  //   }
  // }

  const handleCancel = () => {
    reset()
  }

  const handleSave = async () => {
    await save()
  }

  return (
    <>
      <AppHeader variant="compact">
        <div className="flex h-full w-full items-center justify-between gap-3 px-2 sm:px-4 min-w-0">
          <div className="min-w-0 flex-1 flex items-center">
            <BreadcrumbNav
              items={[
                ...updateBreadcrumbs,
                { label: data?.question_metadata?.title ?? "加载中..." },
              ]}
            />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 min-w-0">
            {isDirty && (
              <SaveCancelButtons
                isSaving={isSaving}
                pendingAudioCount={pendingAudioCount}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}
            {!isDirty && (
              <ExportButtons
                scriptId={taskId!}
                templateName={activeTemplateName}
              />
            )}
            <Button
              variant="ghost"
              className="gap-1.5 px-2 sm:px-3"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="size-4 shrink-0" />
              <span className="hidden sm:inline">分享</span>
            </Button>
          </div>
        </div>
      </AppHeader>
      <div className="flex h-screen flex-col gap-4 pt-12">
        {/* 编辑器布局 */}
        <EditorLayout
          leftSidebar={
            <EditorLeft
              playerRef={playerRef}
              subtitleFrameMap={subtitleFrameMap}
              scriptTaskId={taskId ?? ""}
            />
          }
          rightSidebar={
            <EditorRight
              playerRef={playerRef}
              subtitleFrameMap={subtitleFrameMap}
              scriptId={taskId ?? ""}
            />
          }
          content={
            <EditorContent
              playerRef={playerRef}
              durationInFrames={totalDurationFrames}
              scenes={scenes}
              topBar={
                <div className="flex h-12 items-center justify-between px-4">
                  <h2 className="text-sm font-medium">合成画面</h2>
                  {!isDirty && (
                    <TemplateBar
                      templateNames={templateNames}
                      onRefreshTemplates={refreshTemplates}
                      initialTemplate={initialTemplate}
                      onApplyTemplate={handleApplyTemplate}
                    />
                  )}
                </div>
              }
              segmentBar={
                // <SceneSegmentBar
                //   scenes={scenes}
                //   fps={renderFps}
                //   onSceneClick={handleTabChange}
                //   playerRef={playerRef}
                // />
                undefined
              }
              controllerActions={
                <div className="flex justify-end">
                  <RenderSettingsBar visible={!isDirty} />
                </div>
              }
            />
          }
        />
      </div>
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/share/${taskId}`}
      />
    </>
  )
}
