export interface RecorderState {
  status: "idle" | "recording" | "stopped"
  duration: number
}

type StateCallback = (state: RecorderState) => void

/**
 * 浏览器录音封装：MediaRecorder → webm Blob → WAV 转换。
 * 30 秒自动停止由调用方通过 maxDuration 控制。
 */
export function createAudioRecorder() {
  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let startTime = 0
  let lastDuration = 0
  let timer: number | null = null
  let stream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let onChange: StateCallback | null = null
  let maxDuration = 30
  let autoStopTimer: number | null = null
  let stopResolve: ((blob: Blob) => void) | null = null

  const getState = (): RecorderState => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      return {
        status: chunks.length > 0 ? "stopped" : "idle",
        duration: lastDuration,
      }
    }
    return {
      status: "recording",
      duration: (Date.now() - startTime) / 1000,
    }
  }

  const emit = () => onChange?.(getState())

  const cleanupStream = () => {
    stream?.getTracks().forEach((t) => t.stop())
    audioCtx?.close()
    audioCtx = null
    analyser = null
  }

  const clearTimers = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    if (autoStopTimer !== null) {
      clearTimeout(autoStopTimer)
      autoStopTimer = null
    }
  }

  return {
    async start(cb: StateCallback, max = 30) {
      onChange = cb
      maxDuration = max
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 分析器节点：用于实时波形可视化
      audioCtx = new AudioContext()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      analyser.smoothingTimeConstant = 0.4
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)

      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunks = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      mediaRecorder.onstop = () => {
        lastDuration = (Date.now() - startTime) / 1000
        cleanupStream()
        emit()
        if (stopResolve) {
          stopResolve(new Blob(chunks, { type: "audio/webm" }))
          stopResolve = null
        }
      }

      mediaRecorder.start()
      startTime = Date.now()
      lastDuration = 0
      timer = window.setInterval(emit, 100)

      autoStopTimer = window.setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop()
        }
      }, maxDuration * 1000)

      emit()
    },

    stop(): Promise<Blob> {
      clearTimers()
      const mr = mediaRecorder
      if (mr && mr.state === "recording") {
        return new Promise((resolve) => {
          stopResolve = resolve
          mr.stop()
        })
      }
      cleanupStream()
      return Promise.resolve(new Blob(chunks, { type: "audio/webm" }))
    },

    cancel() {
      stopResolve = null
      clearTimers()
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop()
      }
      cleanupStream()
      chunks = []
      lastDuration = 0
      emit()
    },

    getFrequencyData(): Uint8Array | null {
      if (!analyser) return null
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      return data
    },
  }
}

/** 将 webm 音频 Blob 解码后编码为 16-bit PCM WAV */
export async function webmToWav(webmBlob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  const buf = await ctx.decodeAudioData(await webmBlob.arrayBuffer())
  await ctx.close()

  const sr = buf.sampleRate
  const samples = buf.getChannelData(0)
  const dataLen = samples.length * 2
  const wav = new ArrayBuffer(44 + dataLen)
  const v = new DataView(wav)

  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i))
  }

  w(0, "RIFF")
  v.setUint32(4, 36 + dataLen, true)
  w(8, "WAVE")
  w(12, "fmt ")
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sr, true)
  v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  w(36, "data")
  v.setUint32(40, dataLen, true)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([wav], { type: "audio/wav" })
}
