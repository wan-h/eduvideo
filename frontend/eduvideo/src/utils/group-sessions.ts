import type { SessionInfo } from "@/api/eduai/conversation.types"

export interface TimeGroup {
  key: string
  label: string
}

export interface SessionGroup {
  group: TimeGroup
  sessions: SessionInfo[]
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

function formatMonthLabel(year: number, month: number): string {
  return `${year}年${month}月`
}

export function groupSessionsByTime(sessions: SessionInfo[]): SessionGroup[] {
  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const thisWeekStart = startOfWeek(now)
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 86400000)

  const groups = new Map<string, SessionInfo[]>()

  for (const session of sessions) {
    const updated = new Date(session.updated_at)
    if (isNaN(updated.getTime())) continue

    const updatedStart = startOfDay(updated)
    let key: string

    if (updatedStart.getTime() >= todayStart.getTime()) {
      key = "今天"
    } else if (updatedStart.getTime() >= yesterdayStart.getTime()) {
      key = "昨天"
    } else if (updatedStart.getTime() >= thisWeekStart.getTime()) {
      key = "本周"
    } else if (updatedStart.getTime() >= thirtyDaysAgo.getTime()) {
      key = "30天内"
    } else {
      key = formatMonthLabel(updated.getFullYear(), updated.getMonth() + 1)
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(session)
  }

  for (const [, list] of groups) {
    list.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  const staticLabels = ["今天", "昨天", "本周", "30天内"]
  const ordered: TimeGroup[] = []

  for (const label of staticLabels) {
    if (groups.has(label)) {
      ordered.push({ key: label, label })
    }
  }

  const monthKeys = [...groups.keys()]
    .filter((k) => !staticLabels.includes(k))
    .sort((a, b) => b.localeCompare(a))

  for (const key of monthKeys) {
    ordered.push({ key, label: key })
  }

  return ordered.map((g) => ({
    group: g,
    sessions: groups.get(g.key)!,
  }))
}
