import { useEffect, useRef } from "react"

interface RecordingWaveformProps {
  isRecording: boolean
  getFrequencyData: () => Uint8Array | null
  className?: string
}

export function RecordingWaveform({
  isRecording,
  getFrequencyData,
  className,
}: RecordingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!isRecording) {
      cancelAnimationFrame(animFrameRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const barCount = 16
    const gap = 2
    const barW = (W - gap * (barCount + 1)) / barCount

    const draw = () => {
      const data = getFrequencyData()
      ctx.clearRect(0, 0, W, H)

      if (!data) {
        ctx.fillStyle = "hsl(142 50% 75% / 0.4)"
        for (let i = 0; i < barCount; i++) {
          const x = gap + i * (barW + gap)
          ctx.fillRect(x, H - 2, barW, 2)
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          const val = data[i] ?? 0
          const h = Math.max(2, (val / 255) * H)
          const y = H - h
          const x = gap + i * (barW + gap)
          const t = val / 255
          const lightness = Math.round(65 - t * 30)
          ctx.fillStyle = `hsl(142 55% ${lightness}%)`
          ctx.fillRect(x, y, barW, h)
        }
      }
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isRecording, getFrequencyData])

  return (
    <canvas ref={canvasRef} width={300} height={48} className={className} />
  )
}
