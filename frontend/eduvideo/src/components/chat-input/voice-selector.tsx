import { Check, Loader2, Mic, Volume2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import type { LanguageType } from "@/api/eduai/shared"
import { listClonedVoices, listSupportedVoices } from "@/api/eduai/tts"
import type { VoiceCloneDesc, VoiceDesc } from "@/api/eduai/tts.types"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { VoiceCloneDialog } from "@/components/voice"
import { useLanguage } from "@/i18n/language-provider"
import { cn } from "@/utils/cn"

interface VoiceSelectorProps {
  value: string
  onChange: (voiceId: string) => void
  language?: LanguageType
}

export function VoiceSelector({
  value,
  onChange,
  language,
}: VoiceSelectorProps) {
  const [supportedVoices, setSupportedVoices] = useState<VoiceDesc[]>([])
  const [clonedVoices, setClonedVoices] = useState<VoiceCloneDesc[]>([])
  const [loading, setLoading] = useState(true)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [open, setOpen] = useState(false)

  /* ── 音色预览 ── */
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null)

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlayingVoiceId(null)
    setLoadingVoiceId(null)
  }, [])

  const togglePreview = useCallback(
    (voiceId: string, url: string) => {
      if (playingVoiceId === voiceId) {
        stopAudio()
        return
      }
      stopAudio()

      setLoadingVoiceId(voiceId)
      const audio = new Audio(url)
      audioRef.current = audio

      audio.addEventListener(
        "canplaythrough",
        () => {
          setLoadingVoiceId(null)
          setPlayingVoiceId(voiceId)
          audio.play().catch(() => {
            stopAudio()
          })
        },
        { once: true }
      )

      audio.addEventListener("error", () => stopAudio(), { once: true })
      audio.addEventListener(
        "ended",
        () => {
          setPlayingVoiceId(null)
          audioRef.current = null
        },
        { once: true }
      )
    },
    [playingVoiceId, stopAudio]
  )

  // 卸载/关闭时停止播放
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  const { language: appLanguage } = useLanguage()

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) stopAudio()
    },
    [stopAudio]
  )

  // 语言变化时刷新音色列表
  useEffect(() => {
    Promise.all([listSupportedVoices(), listClonedVoices()])
      .then(([supported, cloned]) => {
        setSupportedVoices(supported)
        setClonedVoices(cloned)
      })
      .catch(() => {
        // 静默失败
      })
      .finally(() => setLoading(false))
  }, [appLanguage])

  // 当前语言下的预置音色
  const filteredSupported = language
    ? supportedVoices.filter((v) => v.language === language)
    : supportedVoices

  // 语言切换时，若当前选中的预置音色不属于新语言则自动清空
  const prevLanguage = useRef(language)
  useEffect(() => {
    if (prevLanguage.current === language) return
    prevLanguage.current = language
    if (!language || !value) return
    const selected = supportedVoices.find((v) => v.voice === value)
    if (selected && selected.language !== language) {
      onChange("")
    }
  }, [language, value, supportedVoices, onChange])

  // 选中音色的 label，用于 trigger 展示
  // en 模式下预置音色按 `voiceLabelByType` 查表；克隆音色保留用户起的名字
  const selectedVoice = supportedVoices.find((v) => v.voice === value)
  const selectedClone = clonedVoices.find((v) => v.voice_id === value)
  const triggerLabel = selectedVoice
    ? selectedVoice.label
    : selectedClone?.name

  const selectVoice = useCallback(
    (voiceId: string) => {
      onChange(voiceId)
      setOpen(false)
    },
    [onChange]
  )

  const handleSelect = selectVoice

  const handleCloneCreated = useCallback(async () => {
    try {
      const cloned = await listClonedVoices()
      setClonedVoices(cloned)
    } catch {
      // 忽略刷新失败
    }
  }, [])

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            className={cn(
              "h-8 gap-1.5 rounded-full border-transparent text-xs font-medium dark:border-transparent",
              triggerLabel && "text-brand hover:text-brand"
            )}
          >
            <Mic className="size-3.5 shrink-0" />
            <span className="line-clamp-1 max-w-[100px]">
              {triggerLabel ?? "选择音色"}
            </span>
            {triggerLabel && (
              <span
                role="button"
                tabIndex={0}
                className="ml-0.5 flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-border/50 hover:text-foreground"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  onChange("")
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    onChange("")
                  }
                }}
              >
                <X className="size-2.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" side="bottom" className="w-56 p-1">
          {loading ? (
            <div className="px-2 py-4 text-center text-xs text-muted-foreground">
              加载中...
            </div>
          ) : (
            <>
              {/* 预置音色 */}
              {filteredSupported.length > 0 && (
                <div>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    预置音色
                  </div>
                  {filteredSupported.map((v) => {
                    const isSelected = value === v.voice
                    const isPlaying = playingVoiceId === v.voice
                    const isLoading = loadingVoiceId === v.voice

                    return (
                      <div
                        key={v.voice}
                        className="group rounded-sm hover:bg-accent"
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                          onClick={() => handleSelect(v.voice)}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
                            <span className="truncate">
                              {v.label}
                            </span>
                            {v.url && (
                              <span
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "inline-flex shrink-0 items-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-brand",
                                  (isPlaying || isLoading) &&
                                    "text-brand opacity-100"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePreview(v.voice, v.url)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    togglePreview(v.voice, v.url)
                                  }
                                }}
                              >
                                {isLoading ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Volume2 className="size-3.5" />
                                )}
                              </span>
                            )}
                          </span>
                          {isSelected && <Check className="size-4 shrink-0" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 克隆音色 */}
              {clonedVoices.length > 0 && (
                <div>
                  {filteredSupported.length > 0 && (
                    <div className="mx-1 my-1 h-px bg-border" />
                  )}
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    克隆音色
                  </div>
                  {clonedVoices.map((v) => {
                    const isSelected = value === v.voice_id
                    return (
                      <button
                        key={v.voice_id}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => handleSelect(v.voice_id)}
                      >
                        <span className="flex-1 truncate">{v.name}</span>
                        {isSelected && (
                          <Check className="size-4 shrink-0 text-brand" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="mx-1 my-1 h-px bg-border" />
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setCloneDialogOpen(true)}
              >
                <Mic className="size-3" />
                创建克隆音色
              </button>
            </>
          )}
        </PopoverContent>
      </Popover>

      <VoiceCloneDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        onCreated={handleCloneCreated}
      />
    </>
  )
}
