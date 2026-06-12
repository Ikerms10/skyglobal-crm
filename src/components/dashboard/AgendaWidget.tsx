'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, parseISO, isToday } from 'date-fns'
import { Calendar } from 'lucide-react'
import Link from 'next/link'
import { CalendarEvent, EventType } from '@/types'

const EVENT_DOT: Record<EventType | 'project', string> = {
  estimate: '#e6ab35',
  job:      '#5B8CBB',
  payment:  '#4A6741',
  deadline: '#B94A3A',
  personal: '#9a9585',
  project:  '#5B8CBB',
}

interface AgendaItem {
  id: string
  title: string
  start_at: string
  all_day: boolean
  type: EventType | 'project'
  href: string
}

export function AgendaWidget() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekEnd = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  const { data: items = [] } = useQuery({
    queryKey: ['agenda-widget', today],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const [eventsRes, projectsRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_at, all_day, type')
          .gte('start_at', today)
          .lte('start_at', weekEnd + 'T23:59:59')
          .order('start_at')
          .limit(8),

        // Pull projects starting or ending this week
        supabase
          .from('projects')
          .select('id, title, start_date, end_date, status')
          .is('deleted_at', null)
          .not('status', 'in', '("Completed","Cancelled")')
          .or(`start_date.gte.${today},end_date.gte.${today}`)
          .lte('start_date', weekEnd)
          .order('start_date')
          .limit(8),
      ])

      const calItems: AgendaItem[] = (eventsRes.data ?? []).map((e) => ({
        id: `event-${e.id}`,
        title: e.title,
        start_at: e.start_at,
        all_day: e.all_day ?? false,
        type: e.type as EventType,
        href: '/schedule',
      }))

      const projectItems: AgendaItem[] = (projectsRes.data ?? []).map(p => ({
        id: `project-${p.id}`,
        title: p.title,
        start_at: p.start_date + 'T00:00:00',
        all_day: true,
        type: 'project' as const,
        href: '/projects',
      }))

      // Merge and sort by date, dedupe by id
      const all = [...calItems, ...projectItems].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      )

      return all
    },
  })

  return (
    <div className="animate-fade-up" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Calendar size={14} style={{ color: 'var(--c-gold)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.01em' }}>
            This Week
          </span>
        </div>
        <Link href="/schedule" style={{ fontSize: 11, color: 'var(--c-gold)', textDecoration: 'none', fontFamily: "'DM Mono', monospace" }}>
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
          Nothing scheduled — <Link href="/schedule" style={{ color: 'var(--c-gold)', textDecoration: 'none' }}>add a job</Link> to your calendar
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => {
            const startDate = item.start_at.split('T')[0]
            const eventDate = parseISO(startDate)
            const dotColor = EVENT_DOT[item.type] ?? EVENT_DOT.personal
            const isTodayEvent = isToday(eventDate)
            const isProject = item.type === 'project'
            return (
              <Link
                key={item.id}
                href={item.href}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 8px', margin: '0 -8px', borderRadius: 7, transition: 'background 150ms', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-nested)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: isProject ? 2 : '50%', background: dotColor, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 13,
                    fontWeight: isTodayEvent ? 700 : 500,
                    color: isTodayEvent ? 'var(--c-text-1)' : 'var(--c-text-2)',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {isProject ? '🔨 ' : ''}{item.title}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>
                    {isTodayEvent ? 'Today' : format(eventDate, 'EEE, MMM d')}
                    {!item.all_day && ` · ${format(parseISO(item.start_at), 'h:mm a')}`}
                    {isProject && ' · Project'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
