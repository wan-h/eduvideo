import type { PlayerRef } from "@remotion/player"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { interpolate } from "remotion"

type Size = {
  width: number
  height: number
  left: number
  top: number
}

/**
 * 获取元素尺寸
 */
export const useElementSize = (
  ref: React.RefObject<HTMLElement | null>
): Size | null => {
  // eslint-disable-next-line react-hooks/refs
  const [size, setSize] = useState<Size | null>(() => {
    if (!ref.current) return null
    const rect = ref.current.getClientRects()
    if (!rect[0]) return null
    return {
      width: rect[0].width as number,
      height: rect[0].height as number,
      left: rect[0].x as number,
      top: rect[0].y as number,
    }
  })

  const observer = useMemo(() => {
    if (typeof ResizeObserver === "undefined") return null
    return new ResizeObserver((entries) => {
      const { target } = entries[0]
      const newSize = target.getClientRects()
      if (!newSize?.[0]) {
        setSize(null)
        return
      }
      setSize({
        width: newSize[0].width,
        height: newSize[0].height,
        left: newSize[0].x,
        top: newSize[0].y,
      })
    })
  }, [])

  const updateSize = useCallback(() => {
    if (!ref.current) return
    const rect = ref.current.getClientRects()
    if (!rect[0]) {
      setSize(null)
      return
    }
    setSize((prevState) => {
      const isSame =
        prevState &&
        prevState.width === rect[0].width &&
        prevState.height === rect[0].height &&
        prevState.left === rect[0].x &&
        prevState.top === rect[0].y
      if (isSame) return prevState
      return {
        width: rect[0].width as number,
        height: rect[0].height as number,
        left: rect[0].x as number,
        top: rect[0].y as number,
        windowSize: {
          height: window.innerHeight,
          width: window.innerWidth,
        },
      }
    })
  }, [ref])

  useEffect(() => {
    if (!observer) return
    const { current } = ref
    if (current) observer.observe(current)
    return () => {
      if (current) observer.unobserve(current)
    }
  }, [observer, ref, updateSize])

  useEffect(() => {
    window.addEventListener("resize", updateSize)
    return () => window.removeEventListener("resize", updateSize)
  }, [updateSize])

  return useMemo(() => {
    if (!size) return null
    return { ...size, refresh: updateSize }
  }, [size, updateSize])
}

const getFrameFromX = (
  clientX: number,
  durationInFrames: number,
  width: number
) => {
  const pos = clientX
  const frame = Math.round(
    interpolate(pos, [0, width], [0, Math.max(durationInFrames - 1, 0)], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  )
  return frame
}

const BAR_HEIGHT = 5
const KNOB_SIZE = 10
const VERTICAL_PADDING = 4

const containerStyle: React.CSSProperties = {
  userSelect: "none",
  WebkitUserSelect: "none",
  paddingTop: VERTICAL_PADDING,
  paddingBottom: VERTICAL_PADDING,
  boxSizing: "border-box",
  cursor: "pointer",
  position: "relative",
  touchAction: "none",
  flex: 1,
}

const barBackground: React.CSSProperties = {
  height: BAR_HEIGHT,
  backgroundColor: "var(--background)",
  width: "100%",
  borderRadius: BAR_HEIGHT / 2,
}

const findBodyInWhichDivIsLocated = (div: HTMLElement) => {
  let current = div
  while (current.parentElement) {
    current = current.parentElement
  }
  return current
}

export const useHoverState = (
  ref: React.RefObject<HTMLDivElement | null>
): boolean => {
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const { current } = ref
    if (!current) return

    const onHover = () => setHovered(true)
    const onLeave = () => setHovered(false)
    const onMove = () => setHovered(true)

    current.addEventListener("mouseenter", onHover)
    current.addEventListener("mouseleave", onLeave)
    current.addEventListener("mousemove", onMove)

    return () => {
      current.removeEventListener("mouseenter", onHover)
      current.removeEventListener("mouseleave", onLeave)
      current.removeEventListener("mousemove", onMove)
    }
  }, [ref])
  return hovered
}

/**
 * 自定义 SeekBar 进度条
 * - 鼠标拖动跳转
 * - 始终展示滑块
 */
export function SeekBar({
  durationInFrames,
  inFrame,
  outFrame,
  playerRef,
}: {
  durationInFrames: number
  inFrame: number
  outFrame?: number
  playerRef: React.RefObject<PlayerRef | null>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const size = useElementSize(containerRef)
  const [currentFrame, setCurrentFrame] = useState(0)

  useEffect(() => {
    const { current } = playerRef
    if (!current) return

    const onFrameUpdate = () => {
      setCurrentFrame(current.getCurrentFrame())
    }

    current.addEventListener("frameupdate", onFrameUpdate)
    return () => current.removeEventListener("frameupdate", onFrameUpdate)
  }, [playerRef])

  const [dragging, setDragging] = useState<
    { dragging: false } | { dragging: true; wasPlaying: boolean }
  >({ dragging: false })

  const width = size?.width ?? 0

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (!playerRef.current) return

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number
      const frame = getFrameFromX(e.clientX - posLeft, durationInFrames, width)
      const wasPlaying = playerRef.current.isPlaying()
      playerRef.current.pause()
      playerRef.current.seekTo(frame)
      setDragging({ dragging: true, wasPlaying })
    },
    [durationInFrames, width, playerRef]
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.dragging) return
      if (!playerRef.current) return
      if (!size) throw new Error("Player has no size")

      const posLeft = containerRef.current?.getBoundingClientRect()
        .left as number
      const frame = getFrameFromX(
        e.clientX - posLeft,
        durationInFrames,
        size.width
      )
      playerRef.current.seekTo(frame)
    },
    [dragging.dragging, durationInFrames, playerRef, size]
  )

  const onPointerUp = useCallback(() => {
    if (!dragging.dragging) {
      setDragging({ dragging: false })
      return
    }
    if (!playerRef.current) return

    if (dragging.wasPlaying) {
      playerRef.current.play()
    } else {
      playerRef.current.pause()
    }
    setDragging({ dragging: false })
  }, [dragging, playerRef])

  useEffect(() => {
    if (!dragging.dragging) return
    const body = findBodyInWhichDivIsLocated(
      containerRef.current as HTMLElement
    )
    body.addEventListener("pointermove", onPointerMove)
    body.addEventListener("pointerup", onPointerUp)
    return () => {
      body.removeEventListener("pointermove", onPointerMove)
      body.removeEventListener("pointerup", onPointerUp)
    }
  }, [dragging.dragging, onPointerMove, onPointerUp])

  const knobStyle: React.CSSProperties = useMemo(() => {
    return {
      height: KNOB_SIZE,
      width: KNOB_SIZE,
      borderRadius: KNOB_SIZE / 2,
      position: "absolute",
      top: VERTICAL_PADDING - KNOB_SIZE / 2 + BAR_HEIGHT / 2,
      backgroundColor: "var(--foreground)",
      left: Math.max(
        0,
        (currentFrame / Math.max(1, durationInFrames - 1)) * width -
          KNOB_SIZE / 2
      ),
    }
  }, [durationInFrames, currentFrame, width])

  const active: React.CSSProperties = useMemo(() => {
    const endFrame =
      outFrame !== undefined ? Math.min(currentFrame, outFrame) : currentFrame
    const effectiveWidth = Math.max(0, endFrame - inFrame)
    return {
      height: BAR_HEIGHT,
      backgroundColor: "var(--brand)",
      width: (effectiveWidth / (durationInFrames - 1)) * 100 + "%",
      marginLeft: (inFrame / (durationInFrames - 1)) * 100 + "%",
      borderRadius: BAR_HEIGHT / 2,
      position: "absolute",
    }
  }, [durationInFrames, inFrame, outFrame, currentFrame])

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      style={containerStyle}
    >
      <div style={barBackground}>
        <div style={active} />
      </div>
      <div style={knobStyle} />
    </div>
  )
}
