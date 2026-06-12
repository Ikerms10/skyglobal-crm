'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react'
import Link from 'next/link'

type Priority = 'high' | 'medium' | 'low'

interface Todo {
  id: string
  text: string
  completed: boolean
  priority: Priority
  created_at: string
}

// daily_todos columns are nullable with DB-side defaults — normalize at the
// fetch boundary so the rest of the page works with the strict Todo shape.
function toTodo(row: { id: string; text: string; completed: boolean | null; priority: string | null; created_at: string | null }): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed ?? false,
    priority: (row.priority ?? 'medium') as Priority,
    created_at: row.created_at ?? '',
  }
}

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const PRIORITY_COLOR: Record<Priority, string> = {
  high: 'var(--error)',
  medium: 'var(--gold)',
  low: 'var(--text-tertiary)',
}
const PRIORITY_BG: Record<Priority, string> = {
  high: 'rgba(255,69,58,0.12)',
  medium: 'rgba(230,171,53,0.12)',
  low: 'rgba(239,234,226,0.06)',
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function offsetDate(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + days)
  return dt.toISOString().split('T')[0]
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

interface BriefingSummary {
  activeJobs: number
  followUps: number
  overduePayments: number
  overdueOwed: number
  newLeads: number
}

export default function DailyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const date = searchParams.get('date') ?? todayStr()
  const isToday = date === todayStr()

  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('medium')
  const [showCompleted, setShowCompleted] = useState(false)
  const [briefing, setBriefing] = useState<BriefingSummary | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestNotes = useRef(notes)
  latestNotes.current = notes

  // Navigate by date
  const goTo = useCallback((d: string) => {
    router.push(`/daily?date=${d}`)
  }, [router])

  // Keyboard shortcuts: Cmd+Left / Cmd+Right
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') {
        e.preventDefault()
        goTo(offsetDate(date, -1))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') {
        e.preventDefault()
        goTo(offsetDate(date, 1))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [date, goTo])

  // Load user + data
  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [notesRes, todosRes, jobsRes, followRes, overdueRes, leadsRes] = await Promise.all([
        supabase.from('daily_notes').select('notes').eq('date', date).maybeSingle(),
        supabase.from('daily_todos').select('*').eq('date', date).order('created_at'),
        supabase.from('projects').select('id').is('deleted_at', null).eq('status', 'In Progress'),
        supabase.from('leads').select('id').is('deleted_at', null).eq('follow_up_date', date).not('stage', 'in', '("Won","Lost")'),
        supabase.from('projects').select('contract_value, amount_paid').is('deleted_at', null).eq('status', 'Completed').not('payment_status', 'eq', 'Paid'),
        supabase.from('leads').select('id').is('deleted_at', null).gte('created_at', date + 'T00:00:00').lte('created_at', date + 'T23:59:59'),
      ])

      setNotes(notesRes.data?.notes ?? '')
      setTodos((todosRes.data ?? []).map(toTodo))

      const owed = (overdueRes.data ?? []).reduce((s, p) => s + ((p.contract_value ?? 0) - (p.amount_paid ?? 0)), 0)
      setBriefing({
        activeJobs: jobsRes.data?.length ?? 0,
        followUps: followRes.data?.length ?? 0,
        overduePayments: overdueRes.data?.length ?? 0,
        overdueOwed: owed,
        newLeads: leadsRes.data?.length ?? 0,
      })
    }
    load()
  }, [date])

  // Auto-save notes with debounce
  const handleNotesChange = (val: string) => {
    setNotes(val)
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!userId) return
      const supabase = createClient()
      await supabase.from('daily_notes').upsert(
        { user_id: userId, date, notes: latestNotes.current, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
      )
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1000)
  }

  // Add todo
  const addTodo = async () => {
    const text = newTodoText.trim()
    if (!text || !userId) return
    const supabase = createClient()
    const { data } = await supabase.from('daily_todos').insert({
      user_id: userId, date, text, priority: newPriority, completed: false,
    }).select().single()
    if (data) setTodos(prev => [...prev, toTodo(data)])
    setNewTodoText('')
  }

  // Toggle todo
  const toggleTodo = async (id: string, completed: boolean) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    const supabase = createClient()
    await supabase.from('daily_todos').update({ completed }).eq('id', id)
  }

  // Delete todo
  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
    const supabase = createClient()
    await supabase.from('daily_todos').delete().eq('id', id)
  }

  const activeTodos = todos.filter(t => !t.completed).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  const completedTodos = todos.filter(t => t.completed)

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  }

  return (
    <div style={{ padding: '40px', maxWidth: 1100, margin: '0 auto' }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Daily Notes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>{formatDate(date)}</p>
        </div>

        {/* Date navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => goTo(offsetDate(date, -1))}
            title="Previous day (⌘←)"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={16} />
          </button>
          {!isToday && (
            <button
              onClick={() => goTo(todayStr())}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--gold)' }}
            >
              Today
            </button>
          )}
          <button
            onClick={() => goTo(offsetDate(date, 1))}
            title="Next day (⌘→)"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 20, marginBottom: 20 }}>

        {/* LEFT: Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={card}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>📝 Notes</p>
              <span style={{ fontSize: 11, color: saveStatus === 'saved' ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : ''}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="What's on your mind today? Notes, plans, observations…"
              style={{
                width: '100%', minHeight: 280, padding: '16px 20px',
                background: 'transparent', border: 'none', outline: 'none', resize: 'vertical',
                fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick Links */}
          <div style={card}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Quick Links</p>
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { href: '/leads', label: '🎯 Leads' },
                { href: '/customers', label: '👥 Customers' },
                { href: '/projects', label: '🏗️ Projects' },
                { href: '/expenses', label: '💰 Expenses' },
                { href: '/reports', label: '📊 Reports' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  padding: '7px 14px', borderRadius: 20,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
                  transition: 'background 100ms',
                }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: To-Dos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={card}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                ✅ To-Do <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 6 }}>{activeTodos.length} remaining</span>
              </p>
            </div>

            {/* Add task */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Add a task…"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  fontSize: 13, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {(['high', 'medium', 'low'] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                      border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                      background: newPriority === p ? PRIORITY_BG[p] : 'transparent',
                      color: newPriority === p ? PRIORITY_COLOR[p] : 'var(--text-tertiary)',
                      outline: newPriority === p ? `1px solid ${PRIORITY_COLOR[p]}` : 'none',
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={addTodo}
                  disabled={!newTodoText.trim()}
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: 'var(--gold)', border: 'none', cursor: 'pointer',
                    color: '#000', opacity: newTodoText.trim() ? 1 : 0.4,
                  }}
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>

            {/* Active tasks */}
            <div style={{ padding: '8px 0' }}>
              {activeTodos.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px 0' }}>No tasks · add one above</p>
              )}
              {activeTodos.map(todo => (
                <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
            </div>

            {/* Completed section */}
            {completedTodos.length > 0 && (
              <>
                <div
                  onClick={() => setShowCompleted(s => !s)}
                  style={{ padding: '8px 20px', borderTop: '1px solid var(--border-subtle)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>
                    Completed ({completedTodos.length})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{showCompleted ? '▲' : '▼'}</span>
                </div>
                {showCompleted && completedTodos.map(todo => (
                  <TodoRow key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Briefing summary */}
      {briefing && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              ☀️ Day Snapshot
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <BriefCell label="Jobs in Progress" value={String(briefing.activeJobs)} color="var(--gold)" border="right" />
            <BriefCell
              label="Follow-ups Today"
              value={String(briefing.followUps)}
              color={briefing.followUps > 0 ? 'var(--blue)' : 'var(--success)'}
              border="right"
            />
            <BriefCell
              label="Payments Outstanding"
              value={String(briefing.overduePayments)}
              color={briefing.overduePayments > 0 ? 'var(--error)' : 'var(--success)'}
              sub={briefing.overdueOwed > 0 ? formatCurrency(briefing.overdueOwed) + ' owed' : undefined}
              border="right"
            />
            <BriefCell label="New Leads" value={String(briefing.newLeads)} color="var(--blue)" />
          </div>
        </div>
      )}
    </div>
  )
}

function TodoRow({ todo, onToggle, onDelete }: {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 20px',
      opacity: todo.completed ? 0.5 : 1,
      transition: 'opacity 150ms',
    }}>
      <button
        onClick={() => onToggle(todo.id, !todo.completed)}
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `2px solid ${todo.completed ? PRIORITY_COLOR[todo.priority] : 'var(--border-strong)'}`,
          background: todo.completed ? PRIORITY_BG[todo.priority] : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 0,
        }}
      >
        {todo.completed && <Check size={10} style={{ color: PRIORITY_COLOR[todo.priority] }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 13, color: 'var(--text-primary)',
          textDecoration: todo.completed ? 'line-through' : 'none',
        }}>
          {todo.text}
        </span>
      </div>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[todo.priority], flexShrink: 0 }} />
      <button
        onClick={() => onDelete(todo.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, display: 'flex', opacity: 0.5 }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function BriefCell({ label, value, color, sub, border }: {
  label: string; value: string; color: string; sub?: string; border?: 'right'
}) {
  return (
    <div style={{
      padding: '16px 20px',
      borderRight: border === 'right' ? '1px solid var(--border-subtle)' : 'none',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, margin: 0, letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}
