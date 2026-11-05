import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type AppLanguage, useLanguage } from "@/i18n/language-provider"
import { Languages } from "lucide-react"

const languages: Array<{ value: AppLanguage; label: string }> = [
  { value: "zh-CN", label: "中文" },
  { value: "en", label: "English" },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-full bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground"
          aria-label="语言切换"
          title="语言切换"
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-32">
        <DropdownMenuRadioGroup
          value={language}
          onValueChange={(value) => setLanguage(value as AppLanguage)}
        >
          {languages.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              className="px-2.5 py-2"
            >
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
