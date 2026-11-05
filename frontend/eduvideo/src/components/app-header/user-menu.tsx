import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/auth-store"
import { Check, FolderKanban, Monitor, Moon, Palette, Sun } from "lucide-react"
import { useNavigate } from "react-router"

type Theme = "dark" | "light" | "system"

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "系统主题", icon: Monitor },
  { value: "light", label: "亮色模式", icon: Sun },
  { value: "dark", label: "暗色模式", icon: Moon },
]

interface UserMenuProps {
  isCompact?: boolean
}

export function UserMenu({ isCompact = false }: UserMenuProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const userInfo = useAuthStore((s) => s.userInfo)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="brand"
          size={isCompact ? "default" : "lg"}
          className="font-medium"
        >
          {userInfo.username || userInfo.uid}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        <DropdownMenuItem onClick={() => navigate("/studio")}>
          <FolderKanban className="h-4 w-4" />
          我的项目
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette />
            主题切换
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {themes.map((t) => (
              <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)}>
                <t.icon className="mr-2 h-4 w-4" />
                {t.label}
                {theme === t.value && <Check className="ml-2 h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}