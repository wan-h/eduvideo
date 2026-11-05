import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

interface UseInlineRenameOptions {
  onSave: (value: string) => Promise<void>
}

export function useInlineRename({ onSave }: UseInlineRenameOptions) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentNameRef = useRef("")
  const editValueRef = useRef(editValue)
  const onSaveRef = useRef(onSave)

  useLayoutEffect(() => {
    editValueRef.current = editValue
    onSaveRef.current = onSave
  })

  const startEditing = useCallback((currentName: string) => {
    currentNameRef.current = currentName
    setEditValue(currentName)
    setEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  const cancelEditing = useCallback(() => {
    setEditing(false)
    setEditValue("")
  }, [])

  const commitRename = useCallback(async () => {
    const trimmed = editValueRef.current.trim()
    if (!trimmed || trimmed === currentNameRef.current) {
      setEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSaveRef.current(trimmed)
    } finally {
      setIsSaving(false)
      setEditing(false)
    }
  }, [])

  useEffect(() => {
    if (!editing) return
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        commitRename()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [editing, commitRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") commitRename()
      if (e.key === "Escape") cancelEditing()
    },
    [commitRename, cancelEditing]
  )

  return {
    editing,
    editValue,
    isSaving,
    inputRef,
    containerRef,
    startEditing,
    cancelEditing,
    setEditValue,
    commitRename,
    handleKeyDown,
  } as const
}
