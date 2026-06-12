import { startOfWeek, startOfMonth, startOfYear } from 'date-fns'

import type { Period } from '@/contexts/TimeFilterContext'

export interface DateRange {
  start: Date
  end: Date
}

// 'all' starts at the Unix epoch so callers can always apply a .gte() filter
// instead of branching on "no filter" — Postgres timestamps never predate it.
export function getDateRange(period: Period): DateRange {
  const now = new Date()
  switch (period) {
    case 'week':
      return { start: startOfWeek(now), end: now }
    case 'month':
      return { start: startOfMonth(now), end: now }
    case 'year':
      return { start: startOfYear(now), end: now }
    case 'all':
      return { start: new Date(0), end: now }
  }
}

// Supabase DATE columns (expenses.date) compare against 'yyyy-MM-dd' strings,
// not full ISO timestamps.
export function toDateOnly(d: Date): string {
  return d.toISOString().split('T')[0]
}
