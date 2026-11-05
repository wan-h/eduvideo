import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 检测页面级文件拖拽状态。
 * 用户拖文件到浏览器窗口时返回 true，离开时返回 false。
 * 仅对文件拖拽（dataTransfer.types 含 "Files"）激活。
 *
 * 同时阻止浏览器默认行为：dragover preventDefault 防止浏览器打开拖入的文件，
 * drop reset 确保区域外松手时状态正确清零。
 */
export function usePageDragDetector(): boolean {
  const [isActive, setIsActive] = useState(false)
  const counterRef = useRef(0)

  const resetCounter = useCallback(() => {
    counterRef.current = 0
    setIsActive(false)
  }, [])

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return
    counterRef.current += 1
    if (counterRef.current === 1) {
      setIsActive(true)
    }
  }, [])

  const handleDragLeave = useCallback((_e: DragEvent) => {
    counterRef.current -= 1
    if (counterRef.current <= 0) {
      counterRef.current = 0
      setIsActive(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return
      resetCounter()
    },
    [resetCounter]
  )

  useEffect(() => {
    document.addEventListener("dragenter", handleDragEnter)
    document.addEventListener("dragleave", handleDragLeave)
    document.addEventListener("dragover", handleDragOver)
    document.addEventListener("drop", handleDrop)

    return () => {
      document.removeEventListener("dragenter", handleDragEnter)
      document.removeEventListener("dragleave", handleDragLeave)
      document.removeEventListener("dragover", handleDragOver)
      document.removeEventListener("drop", handleDrop)
      resetCounter()
    }
  }, [
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    resetCounter,
  ])

  return isActive
}
