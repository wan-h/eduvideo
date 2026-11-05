import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}

export function ShareDialog({ open, onOpenChange, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => setCopied(false)
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>分享视频</DialogTitle>
          <DialogDescription>复制下方链接分享给他人查看</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Input readOnly value={url} className="flex-1" />
          <Button variant="outline" onClick={handleCopy} className="shrink-0">
            {copied ? (
              <>
                <Check className="size-4" />
                已复制
              </>
            ) : (
              <>
                <Copy className="size-4" />
                复制
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
