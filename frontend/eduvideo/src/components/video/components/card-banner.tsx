import { cn } from "@/utils/cn"

interface CardBannerProps {
  text: string
  variant?: "warning" | "info"
}

const variantClasses = {
  warning: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",
}

export function CardBanner({ text, variant = "warning" }: CardBannerProps) {
  return (
    <div
      className={cn(
        "absolute top-2 right-2 z-10 rounded-full px-2 py-0.5",
        "text-xs font-medium",
        "pointer-events-none",
        variantClasses[variant]
      )}
    >
      {text}
    </div>
  )
}
