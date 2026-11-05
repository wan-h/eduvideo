import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { voiceClone } from "@/api/eduai/tts"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  createAudioRecorder,
  webmToWav,
  type RecorderState,
} from "@/utils/audio-recorder"

import { AudioPlaybackBar } from "./audio-playback-bar"
import { RecordingWaveform } from "./recording-waveform"

const CLONE_TEXT = "夏天要走了,秋天要来了"

interface VoiceCloneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function VoiceCloneDialog({
  open,
  onOpenChange,
  onCreated,
}: VoiceCloneDialogProps) {
  const [name, setName] = useState("")
  const [recorderState, setRecorderState] = useState<RecorderState>({
    status: "idle",
    duration: 0,
  })
  const [submitting, setSubmitting] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const recorderRef = useRef(createAudioRecorder())
  const webmBlobRef = useRef<Blob | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const getFrequencyData = useCallback(() => {
    return recorderRef.current.getFrequencyData()
  }, [])

  const handleStartRecord = useCallback(async () => {
    try {
      await recorderRef.current.start(setRecorderState, 30)
    } catch {
      toast.error("无法访问麦克风，请检查权限设置")
    }
  }, [])

  const handleStopRecord = useCallback(async () => {
    webmBlobRef.current = await recorderRef.current.stop()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(webmBlobRef.current)
    audioUrlRef.current = url
    setAudioUrl(url)
    setRecorderState((s) => ({ ...s }))
  }, [])

  const resetForm = () => {
    setName("")
    webmBlobRef.current = null
    setRecorderState({ status: "idle", duration: 0 })
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioUrl(null)
  }

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !webmBlobRef.current) return

    setSubmitting(true)
    try {
      const wavBlob = await webmToWav(webmBlobRef.current)
      const wavFile = new File([wavBlob], `${name}.wav`, { type: "audio/wav" })

      await voiceClone({ name: name.trim(), text: CLONE_TEXT, audio: wavFile })

      onCreated()
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error("音色创建失败，请重试")
    } finally {
      setSubmitting(false)
    }
  }, [name, onCreated, onOpenChange])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        if (recorderState.status === "recording") {
          recorderRef.current.cancel()
        }
        resetForm()
      }
      onOpenChange(open)
    },
    [recorderState.status, onOpenChange]
  )

  // 组件卸载时清理 blob URL
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const isRecording = recorderState.status === "recording"
  const hasRecording = recorderState.status === "stopped"
  const canSubmit = name.trim().length > 0 && hasRecording && !submitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建克隆音色</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">音色名称</label>
            <Input
              placeholder="例如：我的声音"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">跟读文字</label>
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {CLONE_TEXT}
            </p>
            <p className="text-xs text-muted-foreground">
              录制时请朗读上方文字，最长 30 秒
            </p>
          </div>

          {isRecording && (
            <RecordingWaveform
              isRecording
              getFrequencyData={getFrequencyData}
              className="h-12 w-full rounded-md"
            />
          )}

          <div className="flex items-center gap-3">
            {!hasRecording ? (
              <Button
                type="button"
                variant="outline"
                onClick={isRecording ? handleStopRecord : handleStartRecord}
              >
                {isRecording
                  ? `停止录音 (${Math.floor(recorderState.duration)}s)`
                  : "开始录音"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={handleStartRecord}
              >
                重新录音
              </Button>
            )}
            {hasRecording && (
              <AudioPlaybackBar
                audioUrl={audioUrl}
                fallbackDuration={recorderState.duration}
              />
            )}
            {isRecording && (
              <span className="inline-flex items-center gap-1 text-sm text-green-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                录音中
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button variant="brand" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? "提交中..." : "创建音色"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
