import { Brand } from "@/components/app-header/brand"
import { UserMenu } from "@/components/app-header/user-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"

export function ShareHeader() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur">
      <div className="shrink-0">
        <Brand isCompact />
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <LanguageSwitcher />
        <UserMenu isCompact />
      </div>
    </header>
  )
}
