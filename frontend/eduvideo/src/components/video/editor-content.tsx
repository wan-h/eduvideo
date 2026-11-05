import type { FeScene } from "@ask2vid/shared"
import type { PlayerRef } from "@remotion/player"
import type { ReactNode } from "react"
import { VideoPlayer } from "./video-player"

interface EditorContentProps {
  durationInFrames: number
  scenes: FeScene[]
  actionBar?: ReactNode
  topBar?: ReactNode
  bottomBar?: ReactNode
  segmentBar?: ReactNode
  controllerActions?: ReactNode
  playerRef: React.RefObject<PlayerRef | null>
}

/**
 * 视频编辑器内容区域组件
 * - 顶部操作栏：返回、保存/取消（由父组件通过 actionBar 传入）
 * - Tab 切换区域（由父组件通过 topBar 传入）
 * - 中间：视频预览区
 * - 下方：进度条和播放按钮
 * - 底部：操作栏（由父组件通过 bottomBar 传入）
 */
export function EditorContent({
  durationInFrames,
  scenes,
  actionBar,
  topBar,
  bottomBar,
  segmentBar,
  controllerActions,
  playerRef,
}: EditorContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* 顶部操作栏 */}
      {actionBar}

      {/* Tab 切换区域 */}
      {topBar}

      {/* 主内容区域 */}
      <div className="3xl:max-w-[105rem] mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-auto p-4 xl:max-w-7xl 2xl:max-w-[90rem]">
        <VideoPlayer
          playerRef={playerRef}
          durationInFrames={durationInFrames}
          scenes={scenes}
          segmentBar={segmentBar}
          controllerActions={controllerActions}
        />
      </div>

      {/* 底部操作栏 */}
      {bottomBar}
    </div>
  )
}
