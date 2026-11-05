import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Monitor, Moon, Sun } from "lucide-react"

type Theme = "light" | "dark" | "system"

const themeModes: Array<{
  value: Theme
  label: string
  icon: typeof Sun
}> = [
  { value: "light", label: "亮色模式", icon: Sun },
  { value: "dark", label: "暗色模式", icon: Moon },
  { value: "system", label: "系统主题", icon: Monitor },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const ThemeIcon = themeModes.find((mode) => mode.value === theme)?.icon ?? Sun

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="主题切换"
          title="主题切换"
        >
          <ThemeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-36">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {themeModes.map((mode) => (
            <DropdownMenuRadioItem
              key={mode.value}
              value={mode.value}
              className="px-2.5 py-2"
            >
              <mode.icon className="size-4" />
              {mode.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
