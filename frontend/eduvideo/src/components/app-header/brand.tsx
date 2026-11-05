import { cn } from "@/utils/cn"
import { useNavigate } from "react-router"

interface BrandProps {
  isCompact?: boolean
}

export function Brand({ isCompact = false }: BrandProps) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 font-bold text-brand hover:cursor-pointer",
        isCompact ? "text-base" : "text-xl"
      )}
      onClick={() => navigate("/", { replace: true })}
    >
      <img
        src="/favicon.svg"
        alt=""
        className={cn("shrink-0", isCompact ? "h-6 w-auto" : "h-8 w-auto")}
      />
      Eduvideo
    </div>
  )
}
