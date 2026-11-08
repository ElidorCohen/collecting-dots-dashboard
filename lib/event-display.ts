/**
 * Which events the website's main events section shows, using the website's own rules
 * (collecting-dots-frontend lib/events.ts featuredEvents): upcoming events, latest added first,
 * then past events from the last recentDays days, three at most. With nothing current it falls
 * back to the most recent past events. Everything else is still listed in the Full Programme.
 */

export const DEFAULT_RECENT_DAYS = 30
const MAIN_SECTION_SIZE = 3
const DAY = 24 * 60 * 60 * 1000

export type EventStatus =
  | { kind: 'shown' }
  | { kind: 'full' }
  | { kind: 'archive'; daysAgo: number }
  | { kind: 'unreadable' }

function timestamp(date: string) {
  const match = date.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [day, month, year] = match.slice(1).map(Number)
  const value = new Date(year, month - 1, day, 12)
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day ? value.getTime() : null
}

export function eventStatuses(events: { date: string }[], recentDays: number, now = new Date()): EventStatus[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const boundary = today.getTime()
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - recentDays).getTime()
  const dated = events.map((event, added) => ({ added, time: timestamp(event.date) }))
  const readable = dated.filter((event): event is { added: number; time: number } => event.time !== null)
  const upcoming = readable.filter(event => event.time >= boundary).sort((a, b) => b.added - a.added)
  const past = readable.filter(event => event.time < boundary).sort((a, b) => b.time - a.time)
  const current = [...upcoming, ...past.filter(event => event.time >= cutoff)]
  const shown = new Set((current.length ? current : past).slice(0, MAIN_SECTION_SIZE).map(event => event.added))
  const recent = new Set(current.map(event => event.added))

  return dated.map(({ added, time }) => {
    if (time === null) return { kind: 'unreadable' }
    if (shown.has(added)) return { kind: 'shown' }
    if (recent.has(added)) return { kind: 'full' }
    return { kind: 'archive', daysAgo: Math.round((boundary - new Date(time).setHours(0, 0, 0, 0)) / DAY) }
  })
}
