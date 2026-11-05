import { useEffect, useRef, useState } from "react"

interface UseIntersectionObserverOptions {
  threshold?: number
  rootMargin?: string
}

/**
 * 监听目标元素是否进入视口。
 * 返回 [ref callback, isIntersecting]。
 * 用于无限滚动触底检测。
 */
export function useIntersectionObserver({
  threshold = 0,
  rootMargin = "0px",
}: UseIntersectionObserverOptions = {}): [
  (node: HTMLElement | null) => void,
  boolean,
] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const refCallback = (node: HTMLElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      { threshold, rootMargin }
    )

    observer.observe(node)
    observerRef.current = observer
  }

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return [refCallback, isIntersecting]
}
