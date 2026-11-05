import { useCallback, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { submitScriptTask } from "@/api/eduai/script"
import type { ScriptSubmitReq } from "@/api/eduai/script.types"
import { queryClient } from "@/services/query-client"

const NAVIGATE_DELAY_MS = 1000

export function useScriptSubmit() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const submit = useCallback(
    async (req: ScriptSubmitReq) => {
      setIsLoading(true)
      const toastId = toast.loading("正在提交脚本生成任务...")
      try {
        await submitScriptTask(req)
        toast.success("任务已创建", { id: toastId })
        queryClient.invalidateQueries({ queryKey: ["workspace"] })
        await new Promise((resolve) => setTimeout(resolve, NAVIGATE_DELAY_MS))
        const target = req.folder_id
          ? `/studio?fid=${encodeURIComponent(req.folder_id)}`
          : "/studio"
        navigate(target)
      } catch {
        toast.dismiss(toastId)
      } finally {
        setIsLoading(false)
      }
    },
    [navigate]
  )

  return { submit, isLoading }
}
