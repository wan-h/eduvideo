import { ChevronRight, GraduationCap, Languages, Upload } from "lucide-react"
import { useCallback, useState } from "react"
import { useNavigate } from "react-router"

import type { LanguageType, StageType } from "@/api/eduai/shared"
import type { WorkspaceFolderInfo } from "@/api/eduai/workspace.types"
import {
  ChatInput,
  FilePreviewList,
  FileUploader,
  FolderSelectButton,
  OptionSelector,
  VoiceSelector,
} from "@/components/chat-input"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { useHomeDisplayInfo } from "@/hooks/use-home-display-info"
import { usePageDragDetector } from "@/hooks/use-page-drag-detector"
import { useSeoMeta } from "@/hooks/use-seo-meta"
import { useSessionStorage } from "@/hooks/use-session-storage"
import { TaskCard } from "@/pages/studio/task-list/components/task-card"
import { SharedVideoCarousel } from "./components/shared-video-carousel"
import { useFileUpload } from "./hooks/use-file-upload"
import { useRecentTasks } from "./hooks/use-recent-tasks"
import { useScriptSubmit } from "./hooks/use-script-submit"
import { useShareVideos } from "./hooks/use-share-videos"
import { CHAT_PANEL_SEO } from "./seo-constants"

const STAGE_OPTIONS = [
  { value: "elementary", label: "小学" },
  { value: "junior", label: "初中" },
  { value: "senior", label: "高中" },
  { value: "university", label: "大学" },
]

const LANGUAGE_OPTIONS = [
  { value: "chinese", label: "中文讲解" },
  { value: "english", label: "英文讲解" },
]

export function ChatPanel() {
  const { items, files, hasUploading, addFiles, removeItem, uploadedUrls } =
    useFileUpload()
  const [stage, setStage] = useSessionStorage("chat:stage", "senior")
  const [language, setLanguage] = useSessionStorage("chat:language", "chinese")
  const [voiceId, setVoiceId] = useSessionStorage("chat:voice_id", "")
  const [folderId, setFolderId] = useSessionStorage("chat:folder_id", "")
  const [folderName, setFolderName] = useSessionStorage("chat:folder_name", "")
  const { submit, isLoading } = useScriptSubmit()
  const { videos: shareVideos, isLoading: shareVideosLoading } =
    useShareVideos()
  const { data: displayInfo } = useHomeDisplayInfo()
  const placeholder =
    displayInfo?.input_placeholder ?? "描述你想要生成的视频..."
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const {
    tasks: recentTasks,
    isLoading: recentLoading,
    refresh: refreshRecentTasks,
  } = useRecentTasks()

  const hasRecentTasks = recentTasks.length > 0

  const isPageDragActive = usePageDragDetector()
  const [isFileOverInput, setIsFileOverInput] = useState(false)

  const handleFileDragActiveChange = useCallback((isOver: boolean) => {
    setIsFileOverInput(isOver)
  }, [])

  const dragOverlay = isPageDragActive ? (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Upload className="size-8" />
        <span className="text-sm font-medium">
          {isFileOverInput ? "释放以上传文件" : "拖到此处上传"}
        </span>
      </div>
    </div>
  ) : null

  useSeoMeta(CHAT_PANEL_SEO)

  const selectedFolder: WorkspaceFolderInfo | null =
    folderId && folderName
      ? { id: folderId, name: folderName, item_type: "folder", created_at: "" }
      : null

  const handleFolderChange = (folder: WorkspaceFolderInfo | null) => {
    setFolderId(folder?.id ?? "")
    setFolderName(folder?.name ?? "")
  }

  const handleSubmit = (text: string) => {
    submit({
      text,
      urls: uploadedUrls,
      stage: stage as StageType,
      language: language as LanguageType,
      voice: voiceId || undefined,
      folder_id: folderId || undefined,
    })
  }

  return (
    <div className={hasRecentTasks ? "min-h-svh" : "h-svh overflow-hidden"}>
      {/* 背景层 */}
      <div className="relative mx-auto h-[80svh] w-full">
        {/* 背景图：暗色模式提亮浅灰元素，增强可见性 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "url('/chat-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            ...(isDark
              ? {
                  filter:
                    "invert(0.9) brightness(1.5) contrast(1.8) saturate(1)",
                }
              : {}),
          }}
        />
        {/* 椭圆形渐变遮罩：暗色模式降低透明度，让背景图透出 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--background) 0%, var(--background) 40%, transparent 80%)",
          }}
        />
        {/* Hero - Chat 垂直居中 */}
        <section
          className={
            hasRecentTasks
              ? "relative flex min-h-screen flex-col items-center justify-start gap-8 px-4 pt-[20vh] pb-16"
              : "relative flex h-svh flex-col items-center justify-center gap-8 px-4 pb-16"
          }
        >
          <div className="text-center">
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                </span>
                教育行业专属解决方案
              </span>
            </div>

            <h1 className="mb-6 text-3xl tracking-tight lg:text-5xl">
              <span className="text-[oklch(0.145_0_0)] dark:text-[oklch(0.985_0_0)]">
                讲题这件事，交给AI就好
              </span>
              <br />
            </h1>

            <p className="mb-10 text-lg text-muted-foreground">
              上传或描述题目，AI自动生成视频讲解，学生课后随时回看，不懂的地方AI解答。
            </p>
          </div>

          <div className="w-full max-w-3xl space-y-10 xl:max-w-3xl 2xl:max-w-[45vw]">
            <section className="sr-only" aria-label="首页 SEO 语义说明">
              <h2>AI 教学视频生成器首页</h2>
              <p>
                Eduvideo AI
                支持把题目、图片和知识内容转换为教学讲解视频，服务于教师备课、教培内容制作与知识传播场景。
              </p>
              <h2>题目与图片生成讲解视频</h2>
              <h3>支持文本输入、图片上传与粘贴</h3>
              <p>
                用户可以直接描述知识点，也可以上传题图、讲义截图和板书素材，生成更清晰的
                AI 讲题视频。
              </p>
              <h2>适合考试冲刺与双语教学</h2>
              <h3>覆盖高考、中考、同步课堂与英文讲解</h3>
              <p>
                首页支持教育阶段和语言选择，适合高频教学内容生产、错题复盘和双语知识讲解视频制作。
              </p>
            </section>

            <ChatInput
              placeholder={placeholder}
              isLoading={isLoading || hasUploading}
              hasAttachments={items.length > 0}
              onPasteFiles={addFiles}
              onDropFiles={addFiles}
              onFileDragActiveChange={handleFileDragActiveChange}
              onSubmit={handleSubmit}
              dragOverlay={dragOverlay}
              previews={
                items.length > 0 ? (
                  <FilePreviewList items={items} onRemove={removeItem} />
                ) : null
              }
              footerLeftActions={
                <div className="flex flex-wrap items-center gap-0">
                  <FileUploader value={files} onAdd={addFiles} />
                  <OptionSelector
                    options={STAGE_OPTIONS}
                    placeholder="教育阶段"
                    value={stage}
                    onChange={(v) => setStage(v as StageType)}
                    icon={GraduationCap}
                    tooltip="限定讲解时使用的知识范围，避免用超纲方法"
                  />
                  <OptionSelector
                    options={LANGUAGE_OPTIONS}
                    placeholder="语言"
                    value={language}
                    onChange={(v) => setLanguage(v as LanguageType)}
                    icon={Languages}
                  />
                  <VoiceSelector
                    value={voiceId}
                    onChange={setVoiceId}
                    language={language as LanguageType}
                  />
                  <FolderSelectButton
                    value={selectedFolder}
                    onChange={handleFolderChange}
                  />
                </div>
              }
            />

            {hasRecentTasks && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">最近任务</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/studio")}
                  >
                    我的项目
                    <ChevronRight className="size-4" />
                  </Button>
                </div>

                {recentLoading && recentTasks.length === 0 ? (
                  <div className="flex gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-28 w-60 flex-shrink-0 animate-pulse rounded-lg border bg-muted"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="group relative flex gap-3 overflow-hidden">
                    {recentTasks.map((task) => (
                      <div key={task.id} className="w-60 flex-shrink-0">
                        <TaskCard
                          task={task}
                          compact
                          onRefresh={refreshRecentTasks}
                          onDelete={() => {
                            navigate("/studio")
                          }}
                        />
                      </div>
                    ))}
                    <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-background" />
                    <button
                      type="button"
                      aria-label="查看更多任务"
                      className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-muted opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => navigate("/studio")}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <SharedVideoCarousel
              videos={shareVideos}
              isLoading={shareVideosLoading}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
