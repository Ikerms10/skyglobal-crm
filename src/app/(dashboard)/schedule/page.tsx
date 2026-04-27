'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus, AlertTriangle,
  Users, Trash2, X, Calendar, RefreshCw,
} from 'lucide-react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks,
  startOfMonth, endOfMonth, isToday, parseISO, addMonths, subMonths,
  isSameDay,
} from 'date-fns'
import { CalendarEvent, EventType } from '@/types'
import { useLanguage } from '@/contexts/LanguageContext'

const EVENT_COLORS: Record<EventType, { dot: string; bg: string; text: string; label: string }> = {
  estimate:  { dot: '#e6ab35', bg: 'rgba(230,171,53,0.12)',  text: '#e6ab35', label: 'Estimate' },
  job:       { dot: '#5B8CBB', bg: 'rgba(91,140,187,0.12)', text: '#5B8CBB', label: 'Job Day' },
  payment:   { dot: '#4A6741', bg: 'rgba(74,103,65,0.12)',  text: '#4A6741', label: 'Payment' },
  deadline:  { dot: '#B94A3A', bg: 'rgba(185,74,58,0.12)', text: '#B94A3A', label: 'Deadline' },
  personal:  { dot: '#9a9585', bg: 'rgba(154,149,133,0.10)', text: '#9a9585', label: 'Personal' },
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CrewAssignment {
  id: string
  user_id: string
  project_id: string | null
  crew_member_name: string
  start_date: string
  end_date: string
  notes: string | null
  project?: {
    id: string
    title: string
    status: string
    contract_value: number | null
    customers: { name: string; address: string | null } | null
  } | null
}

interface AssignFormData {
  crew_member_name: string
  project_id: string
  start_date: string
  end_date: string
  notes: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function assignmentOnDate(a: CrewAssignment, date: Date): boolean {
  const d = format(date, 'yyyy-MM-dd')
  return a.start_date <= d && a.end_date >= d
}

function statusColor(status: string): { border: string; bg: string; glow: string } {
  if (status === 'In Progress') return { border: 'var(--sg-accent)', bg: 'rgba(122,158,126,0.08)', glow: 'rgba(122,158,126,0.2)' }
  if (status === 'Scheduled')   return { border: 'var(--sg-gold)',   bg: 'rgba(139,105,20,0.08)', glow: 'rgba(139,105,20,0.15)' }
  if (status === 'Completed')   return { border: 'var(--sg-success)', bg: 'rgba(74,103,65,0.08)', glow: 'none' }
  return { border: 'var(--sg-danger)', bg: 'rgba(185,74,58,0.08)', glow: 'rgba(185,74,58,0.2)' }
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--sg-border)',
  background: 'transparent',
  color: 'var(--sg-text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  transition: 'border-color 150ms, color 150ms',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  fontSize: 13,
  background: 'var(--sg-bg-surface)',
  border: '1px solid var(--sg-border)',
  color: 'var(--sg-text-primary)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  transition: 'border-color 150ms',
  boxSizing: 'border-box',
}

// ── AssignForm ───────────────────────────────────────────────────────────────

function AssignForm({
  initial,
  prefillDate,
  projects,
  existingMembers,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: CrewAssignment | null
  prefillDate: string | null
  projects: { id: string; title: string; status: string; contract_value: number | null }[]
  existingMembers: string[]
  onSave: (form: AssignFormData) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState<AssignFormData>({
    crew_member_name: initial?.crew_member_name ?? '',
    project_id: initial?.project_id ?? '',
    start_date: initial?.start_date ?? prefillDate ?? today,
    end_date: initial?.end_date ?? prefillDate ?? today,
    notes: initial?.notes ?? '',
  })

  const set = (k: keyof AssignFormData, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.crew_member_name.trim()) { toast.error('Crew member name is required'); return }
    if (!form.start_date || !form.end_date) { toast.error('Dates are required'); return }
    if (form.end_date < form.start_date) { toast.error('End date must be on or after start date'); return }
    onSave(form)
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--sg-text-muted)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 5,
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Crew member */}
        <div>
          <label htmlFor="crew-name" style={labelStyle}>Crew Member</label>
          <input
            id="crew-name"
            list="crew-names"
            value={form.crew_member_name}
            onChange={e => set('crew_member_name', e.target.value)}
            placeholder="Full name"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--sg-border-bright)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--sg-border)' }}
            autoComplete="off"
          />
          <datalist id="crew-names">
            {existingMembers.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        {/* Project */}
        <div>
          <label htmlFor="project-select" style={labelStyle}>Project</label>
          <select
            id="project-select"
            value={form.project_id}
            onChange={e => set('project_id', e.target.value)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--sg-border-bright)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--sg-border)' }}
          >
            <option value="">— No project linked —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label htmlFor="start-date" style={labelStyle}>Start Date</label>
            <input
              id="start-date"
              type="date"
              value={form.start_date}
              onChange={e => set('start_date', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--sg-border-bright)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--sg-border)' }}
            />
          </div>
          <div>
            <label htmlFor="end-date" style={labelStyle}>End Date</label>
            <input
              id="end-date"
              type="date"
              value={form.end_date}
              min={form.start_date}
              onChange={e => set('end_date', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--sg-border-bright)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--sg-border)' }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="assign-notes" style={labelStyle}>Notes</label>
          <textarea
            id="assign-notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Optional notes..."
            rows={2}
            style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
            onFocus={e => { e.target.style.borderColor = 'var(--sg-border-bright)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--sg-border)' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={ghostBtnStyle}>Cancel</button>
        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: '9px 20px',
            borderRadius: 8,
            border: '1px solid var(--sg-border-bright)',
            background: 'var(--sg-accent)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)',
            opacity: isSaving ? 0.7 : 1,
            transition: 'opacity 150ms',
          }}
        >
          {isSaving ? 'Saving…' : 'Save Assignment'}
        </button>
      </div>
    </form>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [pageTab, setPageTab] = useState<'crew' | 'events'>('crew')
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [prefillDate, setPrefillDate] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [editAssignment, setEditAssignment] = useState<CrewAssignment | null>(null)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [addEventDate, setAddEventDate] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState({ title: '', type: 'estimate' as EventType, start_at: '', end_at: '', all_day: true, notes: '' })

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(currentDate,   { weekStartsOn: 1 })
  const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', format(weekStart, 'yyyy-MM-dd'), view],
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { assignments: [], projects: [] }

      const windowStart = view === 'week'
        ? format(subWeeks(weekStart, 1), 'yyyy-MM-dd')
        : format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const windowEnd = view === 'week'
        ? format(addWeeks(weekEnd, 1), 'yyyy-MM-dd')
        : format(endOfMonth(currentDate), 'yyyy-MM-dd')

      const [assignRes, projRes] = await Promise.all([
        supabase.from('crew_assignments')
          .select('*, project:projects(id, title, status, contract_value, customers(name, address))')
          .eq('user_id', user.id)
          .lte('start_date', windowEnd)
          .gte('end_date', windowStart),
        supabase.from('projects')
          .select('id, title, status, contract_value')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .in('status', ['Scheduled', 'In Progress'])
          .order('title'),
      ])

      return {
        assignments: (assignRes.data ?? []) as CrewAssignment[],
        projects: projRes.data ?? [],
      }
    },
  })

  const assignments = data?.assignments ?? []
  const projects    = data?.projects ?? []

  // Events query for the new events calendar tab
  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const mStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const mEnd   = format(endOfMonth(currentDate),   'yyyy-MM-dd')
      const { data } = await supabase
        .from('events')
        .select('*, project:projects(id, title), lead:leads(id, title)')
        .eq('user_id', user.id)
        .gte('start_at', mStart)
        .lte('start_at', mEnd + 'T23:59:59')
        .order('start_at')
      return (data ?? []) as CalendarEvent[]
    },
  })

  const saveEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_at) {
      toast.error('Title and date are required')
      return
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        title: newEvent.title,
        type: newEvent.type,
        start_at: newEvent.start_at,
        end_at: newEvent.end_at || null,
        all_day: newEvent.all_day,
        notes: newEvent.notes || null,
      })
      if (error) throw error
      toast.success('Event added')
      setAddEventOpen(false)
      setNewEvent({ title: '', type: 'estimate', start_at: '', end_at: '', all_day: true, notes: '' })
      refetchEvents()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save event')
    }
  }

  const deleteEvent = async (id: string) => {
    const supabase = createClient()
    await supabase.from('events').delete().eq('id', id)
    refetchEvents()
  }

  const crewMembers = Array.from(new Set(assignments.map(a => a.crew_member_name))).sort()

  const conflicts: Set<string> = new Set()
  crewMembers.forEach(member => {
    const memberAssignments = assignments.filter(a => a.crew_member_name === member)
    weekDays.forEach(day => {
      const dayAssignments = memberAssignments.filter(a => assignmentOnDate(a, day))
      if (dayAssignments.length >= 2) {
        dayAssignments.forEach(a => conflicts.add(a.id))
      }
    })
  })
  const conflictCount = conflicts.size > 0
    ? new Set(Array.from(conflicts).map(id => {
        const a = assignments.find(x => x.id === id)
        return a ? `${a.crew_member_name}-${a.start_date}` : id
      })).size
    : 0

  const saveMutation = useMutation({
    mutationFn: async (form: AssignFormData & { id?: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const payload = {
        user_id: user.id,
        crew_member_name: form.crew_member_name,
        project_id: form.project_id || null,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes || null,
      }
      if (form.id) {
        const { error } = await supabase.from('crew_assignments').update(payload).eq('id', form.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('crew_assignments').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      setAssignModalOpen(false)
      setEditAssignment(null)
      toast.success('Assignment saved')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('crew_assignments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      toast.success('Assignment removed')
    },
  })

  // Month view grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthGrid  = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const [tooltip, setTooltip] = useState<{ id: string; title: string; customer: string } | null>(null)

  const closeModals = () => {
    setAssignModalOpen(false)
    setEditAssignment(null)
  }

  const evtLabelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--sg-text-muted)',
    fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
  }
  const evtInputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', border: '1px solid var(--sg-border)',
    borderRadius: 7, background: 'var(--sg-bg-surface)', color: 'var(--sg-text-primary)',
    fontSize: 13, fontFamily: 'var(--font-ui)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sg-bg-base)' }}>
      <style>{`
        .empty-cell-plus { pointer-events: none; }
        div:hover > .empty-cell-plus { opacity: 1 !important; }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.85); } to { opacity:1; transform:scale(1); } }
        @keyframes border-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes tooltipIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .crew-tooltip { animation: tooltipIn 150ms ease both; }
      `}</style>

      {/* Page header */}
      <div style={{ padding: '28px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 28,
              color: 'var(--sg-text-primary)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0,
            }}>
              {pageTab === 'crew' ? t('schedule.crewTitle') : t('schedule.eventsTitle')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)', margin: '2px 0 0' }}>
              {pageTab === 'crew' ? 'Assign and track crew members across active projects' : 'Track estimates, jobs, payments, and deadlines'}
            </p>
          </div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--sg-bg-surface)', borderRadius: 10, border: '1px solid var(--sg-border)' }}>
            {(['crew', 'events'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setPageTab(tab)}
                style={{
                  padding: '5px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
                  background: pageTab === tab ? (tab === 'crew' ? 'var(--sg-accent)' : 'var(--sg-gold)') : 'transparent',
                  color: pageTab === tab ? '#fff' : 'var(--sg-text-secondary)',
                  transition: 'all 150ms',
                }}
              >
                {tab === 'crew' ? `👷 ${t('schedule.crew')}` : `📅 ${t('schedule.title')}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── EVENTS CALENDAR TAB ── */}
      {pageTab === 'events' && (
        <div style={{ padding: '20px 24px' }}>
          {/* Events toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setCurrentDate(d => subMonths(d, 1))} style={ghostBtnStyle}>‹ Prev</button>
              <span style={{ fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 18, color: 'var(--sg-gold)', minWidth: 160, textAlign: 'center' }}>
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button onClick={() => setCurrentDate(d => addMonths(d, 1))} style={ghostBtnStyle}>Next ›</button>
              <button onClick={() => setCurrentDate(new Date())} style={{ ...ghostBtnStyle, fontSize: 11 }}>{t('focus.today')}</button>
            </div>
            <button
              onClick={() => { setNewEvent(e => ({ ...e, start_at: new Date().toISOString().split('T')[0] })); setAddEventOpen(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'var(--sg-gold)', border: 'none', color: '#1d1c17', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            >
              <Plus size={15} /> {t('schedule.addEvent')}
            </button>
          </div>

          {/* Month grid */}
          <div style={{ background: 'var(--sg-bg-surface)', border: '1px solid var(--sg-border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} style={{ padding: '8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', borderBottom: '1px solid var(--sg-border)' }}>
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {eachDayOfInterval({ start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }) }).map(day => {
                const dayStr = format(day, 'yyyy-MM-dd')
                const dayEvents = events.filter(e => e.start_at.split('T')[0] === dayStr)
                const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                return (
                  <div
                    key={dayStr}
                    onClick={() => { setNewEvent(e => ({ ...e, start_at: dayStr })); setAddEventOpen(true) }}
                    style={{
                      minHeight: 90, padding: '6px', borderBottom: '1px solid var(--sg-border)', borderRight: '1px solid var(--sg-border)',
                      background: isToday(day) ? 'rgba(139,105,20,0.06)' : 'transparent',
                      opacity: isCurrentMonth ? 1 : 0.4, cursor: 'pointer',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isToday(day) ? 'rgba(139,105,20,0.06)' : 'transparent' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: isToday(day) ? 700 : 500, color: isToday(day) ? 'var(--sg-gold)' : 'var(--sg-text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      {format(day, 'd')}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayEvents.slice(0, 3).map(evt => {
                        const ec = EVENT_COLORS[evt.type as EventType] ?? EVENT_COLORS.personal
                        return (
                          <div
                            key={evt.id}
                            onClick={e => { e.stopPropagation(); if (confirm(`Delete "${evt.title}"?`)) deleteEvent(evt.id) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', background: ec.bg, borderRadius: 4, cursor: 'pointer' }}
                            title={evt.title}
                          >
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: ec.dot, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: ec.text, fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                              {evt.title}
                            </span>
                          </div>
                        )
                      })}
                      {dayEvents.length > 3 && (
                        <span style={{ fontSize: 9, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)' }}>+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {Object.entries(EVENT_COLORS).map(([type, style]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot }} />
                <span style={{ fontSize: 11, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)' }}>{style.label}</span>
              </div>
            ))}
          </div>

          {/* Add Event Modal */}
          {addEventOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--sg-bg-surface)', border: '1px solid var(--sg-border)', borderRadius: 14, width: '100%', maxWidth: 480, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--sg-text-primary)', fontFamily: 'var(--font-ui)' }}>Add Event</h3>
                  <button onClick={() => setAddEventOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sg-text-muted)' }}><X size={18} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={evtLabelStyle}>Title *</label>
                    <input value={newEvent.title} onChange={e => setNewEvent(n => ({ ...n, title: e.target.value }))} placeholder="e.g. Site estimate — Johnson" style={evtInputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={evtLabelStyle}>Type</label>
                      <select value={newEvent.type} onChange={e => setNewEvent(n => ({ ...n, type: e.target.value as EventType }))} style={evtInputStyle}>
                        {Object.entries(EVENT_COLORS).map(([t, s]) => <option key={t} value={t}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={evtLabelStyle}>Date *</label>
                      <input type="date" value={newEvent.start_at} onChange={e => setNewEvent(n => ({ ...n, start_at: e.target.value }))} style={evtInputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={evtLabelStyle}>Notes (optional)</label>
                    <input value={newEvent.notes} onChange={e => setNewEvent(n => ({ ...n, notes: e.target.value }))} placeholder="Optional details" style={evtInputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setAddEventOpen(false)} style={ghostBtnStyle}>Cancel</button>
                  <button onClick={saveEvent} style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: 'var(--sg-gold)', color: '#1d1c17', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    Save Event
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREW SCHEDULING TAB ── */}
      {pageTab === 'crew' && (<>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '20px 24px 16px', flexWrap: 'wrap',
      }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setCurrentDate(d => view === 'week' ? subWeeks(d, 1) : subMonths(d, 1))}
            style={ghostBtnStyle}
            aria-label="Previous period"
          >
            ‹ Prev
          </button>
          <span style={{
            fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 20,
            color: 'var(--sg-gold)', minWidth: 220, textAlign: 'center',
          }}>
            {view === 'week'
              ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
              : format(currentDate, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentDate(d => view === 'week' ? addWeeks(d, 1) : addMonths(d, 1))}
            style={ghostBtnStyle}
            aria-label="Next period"
          >
            Next ›
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{ ...ghostBtnStyle, fontSize: 11, color: 'var(--sg-text-muted)' }}
          >
            Today
          </button>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--sg-bg-surface)', borderRadius: 10,
          border: '1px solid var(--sg-border)',
        }}>
          {(['week', 'month'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              style={{
                padding: '5px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)',
                background: view === v ? 'var(--sg-accent)' : 'transparent',
                color: view === v ? '#fff' : 'var(--sg-text-secondary)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => { setPrefillDate(null); setAssignModalOpen(true) }}
          className="glow-blue"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
            borderRadius: 10, background: 'var(--sg-accent)',
            border: '1px solid var(--sg-border-bright)', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'opacity 150ms',
          }}
        >
          <Plus size={15} aria-hidden="true" /> Assign Crew
        </button>
      </div>

      {/* Conflict banner */}
      {conflictCount > 0 && (
        <div style={{
          margin: '0 24px 12px', padding: '10px 16px', borderRadius: 10,
          background: 'rgba(185,74,58,0.1)', border: '1px solid rgba(185,74,58,0.3)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--sg-danger)',
        }}>
          <AlertTriangle size={15} aria-hidden="true" />
          <span style={{ fontFamily: 'var(--font-ui)' }}>
            {conflictCount} scheduling conflict{conflictCount !== 1 ? 's' : ''} detected — review highlighted assignments
          </span>
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div style={{ overflowX: 'auto', padding: '0 24px 24px' }}>
          <div style={{ minWidth: 900 }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', gap: 1, marginBottom: 1 }}>
              <div />
              {weekDays.map(day => (
                <div key={day.toISOString()} style={{
                  textAlign: 'center', padding: '8px 4px',
                  background: isToday(day) ? 'rgba(139,105,20,0.08)' : 'transparent',
                  borderRadius: 8,
                  borderBottom: isToday(day) ? '2px solid var(--sg-gold)' : '1px solid var(--sg-border)',
                }}>
                  <p style={{ fontSize: 10, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                    {format(day, 'EEE').toUpperCase()}
                  </p>
                  <p style={{
                    fontSize: 20, fontWeight: 700,
                    color: isToday(day) ? 'var(--sg-gold)' : 'var(--sg-text-primary)',
                    fontFamily: 'var(--font-rajdhani)', margin: 0, lineHeight: 1.2,
                  }}>
                    {format(day, 'd')}
                  </p>
                </div>
              ))}
            </div>

            {/* Crew rows */}
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)', gap: 1, marginBottom: 2 }}>
                  <div className="skeleton" style={{ height: 72, borderRadius: 8 }} />
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="skeleton" style={{ height: 72, borderRadius: 4 }} />
                  ))}
                </div>
              ))
            ) : crewMembers.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 0',
                color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)', fontSize: 14,
              }}>
                <Users size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} aria-hidden="true" />
                <p style={{ margin: 0 }}>No crew assigned yet</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Click &ldquo;+ Assign Crew&rdquo; to get started</p>
              </div>
            ) : (
              crewMembers.map((member, rowIdx) => {
                const memberAssignments = assignments.filter(a => a.crew_member_name === member)
                return (
                  <div
                    key={member}
                    style={{
                      display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
                      gap: 1, marginBottom: 2,
                      animation: 'fadeSlideUp 0.3s ease both',
                      animationDelay: `${rowIdx * 0.05}s`,
                    }}
                  >
                    {/* Crew name cell */}
                    <div className="glass" style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 12px', height: 72, borderRadius: 8,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--sg-accent), rgba(122,158,126,0.5))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-rajdhani)',
                      }} aria-hidden="true">
                        {member.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <p style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--sg-text-primary)',
                        fontFamily: 'var(--font-ui)', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {member}
                      </p>
                    </div>

                    {/* Day cells */}
                    {weekDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd')
                      const dayAssignments = memberAssignments.filter(a => assignmentOnDate(a, day))
                      const hasConflict = dayAssignments.some(a => conflicts.has(a.id))
                      return (
                        <div
                          key={dayStr}
                          style={{
                            height: 72, borderRadius: 4, position: 'relative', overflow: 'hidden',
                            background: hasConflict
                              ? 'repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(185,74,58,0.06) 4px,rgba(185,74,58,0.06) 8px)'
                              : 'var(--sg-elevated)',
                            border: isToday(day) ? '1px solid rgba(139,105,20,0.2)' : '1px solid var(--sg-border)',
                            cursor: dayAssignments.length === 0 ? 'pointer' : 'default',
                            transition: 'border-color 150ms, background 150ms',
                          }}
                          onMouseEnter={e => {
                            if (dayAssignments.length === 0) e.currentTarget.style.borderColor = 'var(--sg-border-bright)'
                          }}
                          onMouseLeave={e => {
                            if (dayAssignments.length === 0) {
                              e.currentTarget.style.borderColor = isToday(day) ? 'rgba(139,105,20,0.2)' : 'var(--sg-border)'
                            }
                          }}
                          onClick={() => {
                            if (dayAssignments.length === 0) {
                              setPrefillDate(dayStr)
                              setAssignModalOpen(true)
                            }
                          }}
                          aria-label={dayAssignments.length === 0 ? `Add assignment for ${member} on ${dayStr}` : undefined}
                        >
                          {/* Empty cell plus icon */}
                          {dayAssignments.length === 0 && (
                            <div
                              className="empty-cell-plus"
                              style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 150ms',
                              }}
                              aria-hidden="true"
                            >
                              <Plus size={16} style={{ color: 'var(--sg-text-muted)' }} />
                            </div>
                          )}

                          {/* Assignment blocks */}
                          {dayAssignments.map(a => {
                            const sc = statusColor(a.project?.status ?? '')
                            const isConflict = conflicts.has(a.id)
                            return (
                              <div
                                key={a.id}
                                onClick={e => { e.stopPropagation(); setEditAssignment(a) }}
                                style={{
                                  margin: 2, padding: '3px 6px', borderRadius: 4,
                                  background: sc.bg,
                                  borderLeft: `3px solid ${sc.border}`,
                                  boxShadow: isConflict ? '0 0 8px rgba(185,74,58,0.3)' : 'none',
                                  animation: 'scaleIn 0.25s ease both',
                                  cursor: 'pointer', position: 'relative',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.background = 'rgba(122,158,126,0.12)'
                                  setTooltip({ id: a.id, title: a.project?.title ?? 'Unlinked', customer: a.project?.customers?.name ?? '' })
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.background = sc.bg
                                  setTooltip(null)
                                }}
                              >
                                <p style={{
                                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-rajdhani)',
                                  color: 'var(--sg-text-primary)', margin: 0,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90,
                                }}>
                                  {a.project?.title ?? a.crew_member_name}
                                </p>
                                {isConflict && (
                                  <AlertTriangle
                                    size={9}
                                    style={{ color: 'var(--sg-danger)', position: 'absolute', top: 2, right: 2 }}
                                    aria-label="Scheduling conflict"
                                  />
                                )}
                                {tooltip?.id === a.id && (
                                  <div className="crew-tooltip" style={{
                                    position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 100,
                                    background: 'var(--c-text-1)', color: 'var(--c-text-on-dark)',
                                    fontSize: 12, padding: '6px 10px', borderRadius: 6,
                                    boxShadow: 'var(--s-modal)', whiteSpace: 'nowrap', pointerEvents: 'none',
                                  }}>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{tooltip.title}</p>
                                    {tooltip.customer && <p style={{ margin: '2px 0 0', opacity: 0.75 }}>{tooltip.customer}</p>}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '0 24px 24px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} style={{
              textAlign: 'center', padding: '6px 0', fontSize: 10,
              fontFamily: 'var(--font-mono)', color: 'var(--sg-text-muted)', letterSpacing: '0.1em',
            }}>
              {d}
            </div>
          ))}
          {monthGrid.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayAssigns = assignments.filter(a => assignmentOnDate(a, day))
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const today = isToday(day)
            return (
              <div
                key={dayStr}
                onClick={() => setSelectedDay(selectedDay === dayStr ? null : dayStr)}
                style={{
                  minHeight: 80, borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                  background: today ? 'rgba(139,105,20,0.05)' : 'var(--sg-elevated)',
                  border: today ? '1px solid rgba(139,105,20,0.35)' : '1px solid var(--sg-border)',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  transition: 'border-color 150ms, transform 150ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--sg-border-bright)'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = today ? 'rgba(139,105,20,0.35)' : 'var(--sg-border)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                aria-label={`${format(day, 'EEEE, MMM d')}, ${dayAssigns.length} assignment${dayAssigns.length !== 1 ? 's' : ''}`}
              >
                <p style={{
                  fontSize: 13, fontWeight: today ? 700 : 500,
                  color: today ? 'var(--sg-gold)' : 'var(--sg-text-secondary)',
                  fontFamily: 'var(--font-rajdhani)', margin: '0 0 4px',
                }}>
                  {format(day, 'd')}
                </p>
                {dayAssigns.slice(0, 3).map(a => {
                  const sc = statusColor(a.project?.status ?? '')
                  return (
                    <div key={a.id} style={{
                      fontSize: 10, padding: '1px 5px', borderRadius: 3, marginBottom: 1,
                      background: sc.bg, borderLeft: `2px solid ${sc.border}`,
                      color: 'var(--sg-text-primary)', fontFamily: 'var(--font-ui)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      position: 'relative', cursor: 'pointer',
                    }}
                    title={`${a.project?.title ?? '—'} · ${a.project?.customers?.name ?? ''}`}
                    >
                      {a.crew_member_name.split(' ')[0]}: {a.project?.title ?? '—'}
                    </div>
                  )
                })}
                {dayAssigns.length > 3 && (
                  <p style={{ fontSize: 9, color: 'var(--sg-text-muted)', margin: 0 }}>
                    +{dayAssigns.length - 3} more
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── DAY DETAIL DRAWER (month view) ── */}
      {selectedDay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Assignments for ${format(parseISO(selectedDay), 'EEEE, MMM d')}`}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--sg-bg-elevated)', borderTop: '1px solid var(--sg-border-bright)',
            borderRadius: '16px 16px 0 0', padding: '20px 24px',
            maxHeight: '50vh', overflowY: 'auto',
            animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 18,
              color: 'var(--sg-gold)', margin: 0,
            }}>
              {format(parseISO(selectedDay), 'EEEE, MMM d')}
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sg-text-muted)' }}
              aria-label="Close day detail"
            >
              <X size={18} />
            </button>
          </div>
          {assignments.filter(a => assignmentOnDate(a, parseISO(selectedDay))).length === 0 ? (
            <p style={{ color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              No assignments this day
            </p>
          ) : (
            assignments.filter(a => assignmentOnDate(a, parseISO(selectedDay))).map(a => {
              const sc = statusColor(a.project?.status ?? '')
              return (
                <div key={a.id} className="glass" style={{
                  marginBottom: 8, padding: '12px 16px', borderLeft: `3px solid ${sc.border}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 15,
                        color: 'var(--sg-text-primary)', margin: 0,
                      }}>
                        {a.project?.title ?? 'Unlinked project'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--sg-text-secondary)', margin: '2px 0 0', fontFamily: 'var(--font-ui)' }}>
                        {a.crew_member_name} · {a.project?.customers?.name ?? '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sg-danger)', opacity: 0.6 }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
                      aria-label={`Remove assignment for ${a.crew_member_name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── ASSIGN / EDIT MODAL ── */}
      </>)}

      {/* ── ASSIGN / EDIT MODAL ── */}
      {(assignModalOpen || editAssignment) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editAssignment ? 'Edit assignment' : 'Assign crew member'}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(28,18,9,0.85)', backdropFilter: 'blur(8px)',
          }}
          onClick={closeModals}
        >
          <div
            className="glass-elevated"
            style={{
              width: 440, padding: '28px 32px', borderRadius: 16,
              boxShadow: '0 0 60px rgba(139,105,20,0.15)',
              animation: 'scaleIn 0.2s ease',
              borderTop: '3px solid var(--sg-accent)',
              maxWidth: '90vw',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 20,
              color: 'var(--sg-text-primary)', margin: '0 0 20px',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {editAssignment ? 'Edit Assignment' : 'Assign Crew'}
            </h2>
            <AssignForm
              initial={editAssignment}
              prefillDate={prefillDate}
              projects={projects}
              existingMembers={crewMembers}
              onSave={form => saveMutation.mutate(editAssignment ? { ...form, id: editAssignment.id } : form)}
              onCancel={closeModals}
              isSaving={saveMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
