import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon
            className="size-4"
            style={{ color: "var(--toast-success)" }}
          />
        ),
        info: (
          <InfoIcon className="size-4" style={{ color: "var(--toast-info)" }} />
        ),
        warning: (
          <TriangleAlertIcon
            className="size-4"
            style={{ color: "var(--toast-warning)" }}
          />
        ),
        error: (
          <OctagonXIcon
            className="size-4"
            style={{ color: "var(--toast-error)" }}
          />
        ),
        loading: (
          <Loader2Icon
            className="size-4 animate-spin"
            style={{ color: "var(--muted-foreground)" }}
          />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      closeButton
      toastOptions={{
        classNames: {
          toast: "cn-toast group-[.cn-toast]:bg-gradient-to-r",
          success:
            "[--toast-icon-color:var(--toast-success)] [background-image:linear-gradient(to_right,var(--toast-success-bg)_0%,var(--popover)_100%)]! group-[.toaster]:border-success/20!",
          error:
            "[--toast-icon-color:var(--toast-error)] [background-image:linear-gradient(to_right,var(--toast-error-bg)_0%,var(--popover)_100%)]! group-[.toaster]:border-destructive/20!",
          warning:
            "[--toast-icon-color:var(--toast-warning)] [background-image:linear-gradient(to_right,var(--toast-warning-bg)_0%,var(--popover)_100%)]! group-[.toaster]:border-warning/20!",
          info: "[--toast-icon-color:var(--toast-info)] [background-image:linear-gradient(to_right,var(--toast-info-bg)_0%,var(--popover)_100%)]! group-[.toaster]:border-info/20!",
          loading: "[--toast-icon-color:var(--muted-foreground)]",
          icon: "[color:var(--toast-icon-color)]!",
          description: "group-[.toaster]:text-muted-foreground!",
          actionButton:
            "group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground",
          cancelButton:
            "group-[.toaster]:bg-muted group-[.toaster]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
