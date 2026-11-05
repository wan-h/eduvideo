import { LanguageSwitcher } from "@/components/language-switcher"
import { UserMenu } from "./user-menu"

interface UserNavProps {
  isCompact?: boolean
}

export function UserNav({ isCompact = false }: UserNavProps) {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="mr-2 flex items-center gap-1.5">
        <LanguageSwitcher />
      </div>
      <UserMenu isCompact={isCompact} />
    </div>
  )
}