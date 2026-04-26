'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { formatCurrency, formatDate, exportToCSV } from '@/lib/utils'
import {
  format, startOfMonth, endOfMonth, startOfYear, endOfYear,
  subMonths, subYears, eachMonthOfInterval, parseISO, subDays,
} from 'date-fns'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { toast } from 'sonner'
import {
  Plus, Download, Trash2, CreditCard, Receipt,
  TrendingUp, Target, Search, Pencil, Check,
  Settings2, BarChart2,
} from 'lucide-react'

// ─── TYPES ─────────────────────────────────────────────────────────────────────

type ExpenseRow = {
  id: string
  user_id: string
  category: string
  description: string | null
  amount: number
  date: string
  recurring: boolean
  tax_deductible: boolean | null
  project_id: string | null
  deleted_at: string | null
  created_at: string
}

type BudgetSettings = {
  budget_monthly: number | null
  budget_labor: number | null
  budget_materials: number | null
  budget_advertising: number | null
  budget_fuel: number | null
  budget_tools: number | null
  budget_subcontractors: number | null
  budget_overhead: number | null
  budget_insurance: number | null
  budget_software: number | null
  budget_other: number | null
}

type ExpenseFormState = {
  category: string
  description: string
  amount: string
  date: string
  taxDeductible: boolean
  projectId: string
  recurring: boolean
}

type PeriodPreset = 'this_month' | 'last_month' | 'ytd' | 'last_year' | 'all_time' | 'custom'
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'
type GroupOption = 'none' | 'date' | 'category'

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Labor', 'Materials', 'Advertising', 'Fuel', 'Tools',
  'Subcontractors', 'Overhead', 'Insurance', 'Software', 'Other',
] as const

const CATEGORY_COLORS: Record<string, string> = {
  Labor:          '#e6ab35',
  Materials:      '#3583b3',
  Advertising:    '#22c55e',
  Fuel:           '#8b5cf6',
  Tools:          '#f97316',
  Subcontractors: '#06b6d4',
  Overhead:       '#94a3b8',
  Insurance:      '#6366f1',
  Software:       '#0ea5e9',
  Other:          '#6b7280',
}

const CATEGORY_ICONS: Record<string, string> = {
  Labor:          '👷',
  Materials:      '🪣',
  Advertising:    '📢',
  Fuel:           '⛽',
  Tools:          '🔧',
  Subcontractors: '🤝',
  Overhead:       '🏢',
  Insurance:      '🛡️',
  Software:       '💻',
  Other:          '📦',
}

const PERIOD_PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'ytd',        label: 'Year to Date' },
  { id: 'last_year',  label: 'Last Year' },
  { id: 'all_time',   label: 'All Time' },
  { id: 'custom',     label: 'Custom' },
]

const EMPTY_BUDGETS: BudgetSettings = {
  budget_monthly: null, budget_labor: null, budget_materials: null,
  budget_advertising: null, budget_fuel: null, budget_tools: null,
  budget_subcontractors: null, budget_overhead: null, budget_insurance: null,
  budget_software: null, budget_other: null,
}

// ─── DATE UTILITIES ─────────────────────────────────────────────────────────────

function todayStr() { return format(new Date(), 'yyyy-MM-dd') }

function getPeriodRange(preset: PeriodPreset, customFrom: string, customTo: string) {
  const now = new Date()
  switch (preset) {
    case 'this_month':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd'), label: format(now, 'MMMM yyyy') }
    case 'last_month': {
      const lm = subMonths(now, 1)
      return { start: format(startOfMonth(lm), 'yyyy-MM-dd'), end: format(endOfMonth(lm), 'yyyy-MM-dd'), label: format(lm, 'MMMM yyyy') }
    }
    case 'ytd':
      return { start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd'), label: `Jan 1 – Today, ${now.getFullYear()}` }
    case 'last_year': {
      const ly = subYears(now, 1)
      return { start: format(startOfYear(ly), 'yyyy-MM-dd'), end: format(endOfYear(ly), 'yyyy-MM-dd'), label: `${now.getFullYear() - 1} Full Year` }
    }
    case 'all_time':
      return { start: null, end: null, label: 'All Time' }
    case 'custom':
      return { start: customFrom || format(startOfMonth(now), 'yyyy-MM-dd'), end: customTo || format(endOfMonth(now), 'yyyy-MM-dd'), label: 'Custom Range' }
  }
}

function getPrevPeriodRange(preset: PeriodPreset) {
  const now = new Date()
  switch (preset) {
    case 'this_month': { const p = subMonths(now, 1); return { start: format(startOfMonth(p), 'yyyy-MM-dd'), end: format(endOfMonth(p), 'yyyy-MM-dd') } }
    case 'last_month': { const p = subMonths(now, 2); return { start: format(startOfMonth(p), 'yyyy-MM-dd'), end: format(endOfMonth(p), 'yyyy-MM-dd') } }
    case 'ytd':       { const p = subYears(now, 1);  return { start: format(startOfYear(p), 'yyyy-MM-dd'), end: format(p, 'yyyy-MM-dd') } }
    case 'last_year': { const p = subYears(now, 2);  return { start: format(startOfYear(p), 'yyyy-MM-dd'), end: format(endOfYear(p), 'yyyy-MM-dd') } }
    default: return { start: null, end: null }
  }
}

function formatGroupDate(dateStr: string): string {
  const today = todayStr()
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return format(parseISO(dateStr), 'EEEE, MMM d')
}

function budgetKeyForCategory(cat: string): keyof BudgetSettings {
  return `budget_${cat.toLowerCase()}` as keyof BudgetSettings
}

function filterByPeriod(expenses: ExpenseRow[], start: string | null, end: string | null) {
  return expenses.filter(e => {
    if (start && e.date < start) return false
    if (end && e.date > end) return false
    return true
  })
}

// ─── CUSTOM RECHARTS COMPONENTS ────────────────────────────────────────────────

function DonutCenterLabel({ cx, cy, total }: { cx?: number; cy?: number; total: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-8" style={{ fontSize: 10, fill: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>TOTAL</tspan>
      <tspan x={cx} dy="22" style={{ fontSize: 16, fontWeight: 700, fill: 'var(--c-text-1)', fontFamily: "'DM Mono', monospace" }}>
        {formatCurrency(total)}
      </tspan>
    </text>
  )
}

function DonutTooltipContent({ active, payload, total }: any) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
  return (
    <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-mid)', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.payload.fill }} />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text-1)' }}>{item.name}</span>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700, color: 'var(--c-text-1)' }}>{formatCurrency(item.value)}</div>
      <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 2 }}>{pct}% of total</div>
    </div>
  )
}

function TrendTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-mid)', borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--c-text-3)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ color: 'var(--c-text-2)' }}>Total:</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: 'var(--c-text-1)' }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── EXPENSE FORM MODAL ─────────────────────────────────────────────────────────

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: ExpenseFormState) => void
  loading: boolean
  projects: Pick<Project, 'id' | 'title'>[]
  initialValues?: Partial<ExpenseFormState>
  mode: 'add' | 'edit'
}

function ExpenseForm({ open, onClose, onSave, loading, projects, initialValues, mode }: ExpenseFormProps) {
  const defaultForm: ExpenseFormState = {
    category: 'Materials', description: '', amount: '',
    date: todayStr(), taxDeductible: true, projectId: '', recurring: false,
  }
  const [form, setForm] = useState<ExpenseFormState>({ ...defaultForm, ...initialValues })

  useEffect(() => {
    if (open) setForm({ ...defaultForm, ...initialValues })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--c-nested)', border: '1px solid var(--c-border)',
    color: 'var(--c-text-1)', borderRadius: 8, padding: '10px 12px', fontSize: 14,
    outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  const handleSubmit = () => {
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!form.date) { toast.error('Select a date'); return }
    onSave(form)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Log Expense' : 'Edit Expense'}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} style={{ flex: 1 }}>
            {mode === 'add' ? 'Log Expense' : 'Save Changes'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Amount */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Amount *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 700, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>$</span>
            <input
              type="number" step="0.01" min="0" placeholder="0.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              style={{ ...inputStyle, paddingLeft: 30, fontSize: 20, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
              autoFocus
            />
          </div>
        </div>

        {/* Category grid */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Category *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {CATEGORIES.map(cat => {
              const isActive = form.category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '8px 4px', borderRadius: 10,
                    border: `2px solid ${isActive ? CATEGORY_COLORS[cat] : 'var(--c-border)'}`,
                    background: isActive ? `${CATEGORY_COLORS[cat]}20` : 'var(--c-nested)',
                    cursor: 'pointer', transition: 'all 0.12s ease',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat]}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: isActive ? CATEGORY_COLORS[cat] : 'var(--c-text-4)', lineHeight: 1.2, textAlign: 'center' }}>
                    {cat}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Description + Date row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Description</label>
            <input
              type="text" placeholder="What was this for?"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={inputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Date *</label>
            <input
              type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ ...inputStyle, width: 'auto', colorScheme: 'dark', cursor: 'pointer' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
          </div>
        </div>

        {/* Project link */}
        {projects.length > 0 && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Link to Project</label>
            <select
              value={form.projectId}
              onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            >
              <option value="">No project (general expense)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        {/* Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 2 }}>
          {[
            { key: 'taxDeductible' as const, label: 'Tax deductible business expense', color: 'var(--c-sage)' },
            { key: 'recurring' as const, label: 'Recurring monthly expense', color: 'var(--c-gold)' },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${form[key] ? color : 'var(--c-border-mid)'}`,
                background: form[key] ? color : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s ease',
              }}>
                {form[key] && <Check size={11} color={key === 'recurring' ? '#1d1c17' : '#fff'} strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

// ─── BUDGET MODAL ───────────────────────────────────────────────────────────────

interface BudgetModalProps {
  open: boolean
  onClose: () => void
  current: BudgetSettings
  onSave: (data: BudgetSettings) => void
  loading: boolean
}

function BudgetModal({ open, onClose, current, onSave, loading }: BudgetModalProps) {
  const [form, setForm] = useState<BudgetSettings>(current)
  useEffect(() => { if (open) setForm(current) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--c-nested)', border: '1px solid var(--c-border)',
    color: 'var(--c-text-1)', borderRadius: 8, padding: '7px 10px 7px 22px', fontSize: 13,
    outline: 'none', fontFamily: "'DM Mono', monospace",
  }

  return (
    <Modal
      open={open} onClose={onClose} title="Monthly Budgets" size="md"
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
          <Button onClick={() => onSave(form)} loading={loading} style={{ flex: 1 }}>Save Budgets</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Overall Monthly Cap</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", fontSize: 13 }}>$</span>
            <input type="number" min="0" step="100" placeholder="No limit"
              value={form.budget_monthly ?? ''}
              onChange={e => setForm(f => ({ ...f, budget_monthly: e.target.value ? Number(e.target.value) : null }))}
              style={{ ...inputStyle, fontSize: 15, fontWeight: 700 }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-gold)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Per Category (optional)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CATEGORIES.map(cat => {
              const key = budgetKeyForCategory(cat)
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 140, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--c-text-2)' }}>{cat}</span>
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-4)', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>$</span>
                    <input type="number" min="0" step="50" placeholder="No limit"
                      value={form[key] ?? ''}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value ? Number(e.target.value) : null }))}
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = CATEGORY_COLORS[cat] }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  // ── Period state ──────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<PeriodPreset>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expenses-period')
      if (saved && PERIOD_PRESETS.some(p => p.id === saved)) return saved as PeriodPreset
    }
    return 'this_month'
  })
  const [customFrom, setCustomFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [pendingCustomFrom, setPendingCustomFrom] = useState(customFrom)
  const [pendingCustomTo, setPendingCustomTo] = useState(customTo)

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [groupBy, setGroupBy] = useState<GroupOption>('none')
  const [addOpen, setAddOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const queryClient = useQueryClient()
  const { start: periodStart, end: periodEnd, label: periodLabel } = getPeriodRange(period, customFrom, customTo)
  const prevRange = getPrevPeriodRange(period)

  // Persist period to localStorage
  useEffect(() => {
    localStorage.setItem('expenses-period', period)
  }, [period])

  // ── Queries ───────────────────────────────────────────────────────────────────
  const { data: allExpenses = [], isLoading } = useQuery({
    queryKey: ['expenses-all'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('date', { ascending: false })
      return (data ?? []) as ExpenseRow[]
    },
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-active'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('projects')
        .select('id, title')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .in('status', ['Scheduled', 'In Progress'])
        .order('title')
      return (data ?? []) as Pick<Project, 'id' | 'title'>[]
    },
  })

  const { data: budgets = EMPTY_BUDGETS } = useQuery({
    queryKey: ['expense-budgets'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return EMPTY_BUDGETS
      const { data } = await supabase
        .from('business_settings')
        .select('budget_monthly,budget_labor,budget_materials,budget_advertising,budget_fuel,budget_tools,budget_subcontractors,budget_overhead,budget_insurance,budget_software,budget_other')
        .eq('user_id', user.id)
        .single()
      return (data as BudgetSettings) ?? EMPTY_BUDGETS
    },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (form: ExpenseFormState) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
        date: form.date,
        recurring: form.recurring,
        tax_deductible: form.taxDeductible,
        project_id: form.projectId || null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: (_, form) => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] })
      toast.success(`Logged $${Number(form.amount).toFixed(2)} in ${form.category}`)
      setAddOpen(false)
    },
    onError: () => toast.error('Failed to add expense'),
  })

  const editMutation = useMutation({
    mutationFn: async (form: ExpenseFormState) => {
      if (!editExpense) throw new Error('No expense selected')
      const supabase = createClient()
      const { error } = await supabase.from('expenses').update({
        category: form.category,
        description: form.description || null,
        amount: Number(form.amount),
        date: form.date,
        recurring: form.recurring,
        tax_deductible: form.taxDeductible,
        project_id: form.projectId || null,
      }).eq('id', editExpense.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] })
      toast.success('Expense updated')
      setEditExpense(null)
    },
    onError: () => toast.error('Failed to update expense'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('expenses')
        .update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses-all'] })
      toast.success('Expense deleted')
      setDeleteId(null)
    },
  })

  const budgetMutation = useMutation({
    mutationFn: async (data: BudgetSettings) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('business_settings').upsert(
        { user_id: user.id, ...data, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-budgets'] })
      toast.success('Budgets saved')
      setBudgetOpen(false)
    },
    onError: () => toast.error('Failed to save budgets'),
  })

  // ── Computed values ───────────────────────────────────────────────────────────
  const periodExpenses = useMemo(() => filterByPeriod(allExpenses, periodStart, periodEnd), [allExpenses, periodStart, periodEnd])
  const prevExpenses   = useMemo(() => filterByPeriod(allExpenses, prevRange.start, prevRange.end), [allExpenses, prevRange.start, prevRange.end])

  const filtered = useMemo(() => {
    let list = periodExpenses
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e => e.description?.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
    }
    if (filterCat) list = list.filter(e => e.category === filterCat)
    switch (sortBy) {
      case 'newest':  list = [...list].sort((a, b) => b.date.localeCompare(a.date)); break
      case 'oldest':  list = [...list].sort((a, b) => a.date.localeCompare(b.date)); break
      case 'highest': list = [...list].sort((a, b) => b.amount - a.amount); break
      case 'lowest':  list = [...list].sort((a, b) => a.amount - b.amount); break
    }
    return list
  }, [periodExpenses, search, filterCat, sortBy])

  const totalSpent    = useMemo(() => periodExpenses.reduce((s, e) => s + e.amount, 0), [periodExpenses])
  const prevTotal     = useMemo(() => prevExpenses.reduce((s, e) => s + e.amount, 0), [prevExpenses])
  const totalDelta    = totalSpent - prevTotal
  const totalPct      = prevTotal > 0 ? Math.abs((totalDelta / prevTotal) * 100) : null

  const catTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of periodExpenses) map[e.category] = (map[e.category] ?? 0) + e.amount
    return map
  }, [periodExpenses])

  const topCategory = useMemo(() => {
    const entries = Object.entries(catTotals).sort(([, a], [, b]) => b - a)
    if (!entries.length) return null
    const [cat, amt] = entries[0]
    return { cat, amt, pct: totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0 }
  }, [catTotals, totalSpent])

  const biggestExpense = useMemo(() => {
    if (!periodExpenses.length) return null
    return periodExpenses.reduce((max, e) => e.amount > max.amount ? e : max, periodExpenses[0])
  }, [periodExpenses])

  const donutData = useMemo(() =>
    CATEGORIES
      .filter(cat => catTotals[cat] > 0)
      .map(cat => ({ name: cat, value: catTotals[cat], fill: CATEGORY_COLORS[cat] }))
      .sort((a, b) => b.value - a.value),
    [catTotals]
  )

  const trend6Months = useMemo(() => {
    const now = new Date()
    const months = eachMonthOfInterval({ start: subMonths(startOfMonth(now), 5), end: now })
    const currentMonthStr = format(now, 'yyyy-MM')
    return months.map(m => {
      const monthStr = format(m, 'yyyy-MM')
      const total = allExpenses
        .filter(e => e.date.startsWith(monthStr))
        .reduce((s, e) => s + e.amount, 0)
      return { month: format(m, 'MMM'), amount: Math.round(total), isCurrent: monthStr === currentMonthStr }
    })
  }, [allExpenses])

  // Budget alerts (current month only)
  const currentMonthExpenses = useMemo(() => {
    const now = new Date()
    const start = format(startOfMonth(now), 'yyyy-MM-dd')
    const end = format(endOfMonth(now), 'yyyy-MM-dd')
    return filterByPeriod(allExpenses, start, end)
  }, [allExpenses])

  const budgetAlerts = useMemo(() => {
    const alerts: { cat: string; spent: number; budget: number; pct: number }[] = []
    if (!budgets) return alerts
    const monthCatTotals: Record<string, number> = {}
    for (const e of currentMonthExpenses) monthCatTotals[e.category] = (monthCatTotals[e.category] ?? 0) + e.amount
    for (const cat of CATEGORIES) {
      const budgetKey = budgetKeyForCategory(cat)
      const budget = budgets[budgetKey]
      if (!budget) continue
      const spent = monthCatTotals[cat] ?? 0
      const pct = (spent / budget) * 100
      if (pct >= 80) alerts.push({ cat, spent, budget, pct: Math.round(pct) })
    }
    if (budgets.budget_monthly) {
      const totalMonth = currentMonthExpenses.reduce((s, e) => s + e.amount, 0)
      const pct = (totalMonth / budgets.budget_monthly) * 100
      if (pct >= 80) alerts.unshift({ cat: 'Overall', spent: totalMonth, budget: budgets.budget_monthly, pct: Math.round(pct) })
    }
    return alerts
  }, [budgets, currentMonthExpenses])

  // Grouped list
  const groupedList = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', items: filtered }]
    if (groupBy === 'date') {
      const groups: Record<string, ExpenseRow[]> = {}
      filtered.forEach(e => { if (!groups[e.date]) groups[e.date] = []; groups[e.date].push(e) })
      return Object.entries(groups)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, items]) => ({ key, label: formatGroupDate(key), items }))
    }
    if (groupBy === 'category') {
      const groups: Record<string, ExpenseRow[]> = {}
      filtered.forEach(e => { if (!groups[e.category]) groups[e.category] = []; groups[e.category].push(e) })
      return Object.entries(groups)
        .sort(([, a], [, b]) => b.reduce((s, e) => s + e.amount, 0) - a.reduce((s, e) => s + e.amount, 0))
        .map(([key, items]) => ({ key, label: key, items }))
    }
    return [{ key: 'all', label: '', items: filtered }]
  }, [filtered, groupBy])

  const handleExportCSV = () => {
    exportToCSV(filtered.map(e => ({
      Date: e.date, Category: e.category, Description: e.description ?? '',
      Amount: e.amount, 'Tax Deductible': e.tax_deductible ? 'Yes' : 'No',
      Recurring: e.recurring ? 'Yes' : 'No',
    })), `SkyGlobal_Expenses_${periodLabel.replace(/\s/g, '_')}`)
  }

  // ── Edit form initial values ───────────────────────────────────────────────────
  const editInitialValues: Partial<ExpenseFormState> | undefined = editExpense ? {
    category: editExpense.category,
    description: editExpense.description ?? '',
    amount: String(editExpense.amount),
    date: editExpense.date,
    taxDeductible: editExpense.tax_deductible ?? true,
    projectId: editExpense.project_id ?? '',
    recurring: editExpense.recurring,
  } : undefined

  // ── Monthly budget progress ───────────────────────────────────────────────────
  const overallBudgetPct = budgets.budget_monthly
    ? Math.min(100, Math.round((currentMonthExpenses.reduce((s, e) => s + e.amount, 0) / budgets.budget_monthly) * 100))
    : null

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const sectionCard: React.CSSProperties = {
    background: 'var(--c-card)',
    border: '1px solid var(--c-border-light)',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: 'var(--s-card)',
  }

  return (
    <div style={{ padding: 'clamp(12px,4vw,24px)', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text-1)', margin: 0, letterSpacing: '-0.02em' }}>Expenses</h1>
          <p style={{ fontSize: 13, color: 'var(--c-text-4)', margin: '2px 0 0', fontFamily: "'DM Mono', monospace" }}>{periodLabel} · {periodExpenses.length} entries</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setBudgetOpen(true)}>
            <Target size={14} /> Budgets
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Expense
          </Button>
        </div>
      </div>

      {/* ── Budget alerts ── */}
      {budgetAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {budgetAlerts.map(alert => (
            <div key={alert.cat} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 10,
              background: alert.pct >= 100 ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)',
              border: `1px solid ${alert.pct >= 100 ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.25)'}`,
            }}>
              <span style={{ fontSize: 14 }}>{alert.pct >= 100 ? '🔴' : '⚠️'}</span>
              <span style={{ fontSize: 13, color: 'var(--c-text-2)', flex: 1 }}>
                <strong style={{ color: alert.pct >= 100 ? 'var(--c-danger)' : 'var(--c-gold)' }}>{alert.cat} budget {alert.pct >= 100 ? 'exceeded' : `${alert.pct}% used`}</strong>
                {' — '}{formatCurrency(alert.spent)} of {formatCurrency(alert.budget)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Period pills ── */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
          {PERIOD_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, minHeight: 36,
                border: `1px solid ${period === p.id ? 'var(--c-gold-border)' : 'var(--c-border-mid)'}`,
                background: period === p.id ? 'var(--c-gold-bg)' : 'var(--c-nested)',
                color: period === p.id ? 'var(--c-gold)' : 'var(--c-text-3)',
                transition: 'all 0.12s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--c-text-4)' }}>From</span>
            <input type="date" value={pendingCustomFrom} onChange={e => setPendingCustomFrom(e.target.value)}
              style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--c-text-1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', colorScheme: 'dark' }} />
            <span style={{ fontSize: 12, color: 'var(--c-text-4)' }}>To</span>
            <input type="date" value={pendingCustomTo} onChange={e => setPendingCustomTo(e.target.value)}
              style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--c-text-1)', borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', colorScheme: 'dark' }} />
            <Button size="sm" onClick={() => { setCustomFrom(pendingCustomFrom); setCustomTo(pendingCustomTo) }}>
              Apply Range
            </Button>
          </div>
        )}
      </div>

      {/* ── Metric cards ── */}
      {isLoading ? <TableSkeleton rows={1} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {/* Total Spent */}
          <div style={{ ...sectionCard, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Spent</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--c-danger-bg)', border: '1px solid var(--c-danger-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={15} style={{ color: 'var(--c-danger)' }} />
              </div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 800, color: 'var(--c-danger)', lineHeight: 1 }}>{formatCurrency(totalSpent)}</div>
            {totalPct !== null && prevTotal > 0 && (
              <div style={{ fontSize: 11, marginTop: 6, color: totalDelta > 0 ? 'var(--c-danger)' : 'var(--c-sage)', fontFamily: "'DM Mono', monospace" }}>
                {totalDelta > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(totalDelta))} ({totalPct.toFixed(0)}%) vs prior
              </div>
            )}
          </div>

          {/* Largest Category */}
          <div style={{ ...sectionCard, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Top Category</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(53,131,179,0.12)', border: '1px solid rgba(53,131,179,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart2 size={15} style={{ color: '#3583b3' }} />
              </div>
            </div>
            {topCategory ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[topCategory.cat] }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text-1)' }}>{topCategory.cat}</span>
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 700, color: CATEGORY_COLORS[topCategory.cat] }}>{formatCurrency(topCategory.amt)}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 3 }}>{topCategory.pct}% of total</div>
              </>
            ) : <div style={{ fontSize: 13, color: 'var(--c-text-4)' }}>No expenses</div>}
          </div>

          {/* Count */}
          <div style={{ ...sectionCard, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Entries</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt size={15} style={{ color: '#6366f1' }} />
              </div>
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 800, color: 'var(--c-text-1)', lineHeight: 1 }}>{periodExpenses.length}</div>
            <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 5 }}>
              {periodExpenses.length > 0 ? `Avg ${formatCurrency(totalSpent / periodExpenses.length)} / entry` : 'No expenses'}
            </div>
          </div>

          {/* Biggest single */}
          <div style={{ ...sectionCard, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Largest</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={15} style={{ color: '#f97316' }} />
              </div>
            </div>
            {biggestExpense ? (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 800, color: '#f97316', lineHeight: 1 }}>{formatCurrency(biggestExpense.amount)}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biggestExpense.description || biggestExpense.category}</div>
                <div style={{ fontSize: 10, color: 'var(--c-text-4)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{format(parseISO(biggestExpense.date), 'MMM d')}</div>
              </>
            ) : <div style={{ fontSize: 13, color: 'var(--c-text-4)' }}>None</div>}
          </div>

          {/* Budget */}
          <div style={{ ...sectionCard, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Budget</span>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(230,171,53,0.12)', border: '1px solid rgba(230,171,53,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={15} style={{ color: 'var(--c-gold)' }} />
              </div>
            </div>
            {budgets.budget_monthly && overallBudgetPct !== null ? (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 800, color: overallBudgetPct >= 100 ? 'var(--c-danger)' : overallBudgetPct >= 70 ? 'var(--c-gold)' : 'var(--c-sage)', lineHeight: 1 }}>{overallBudgetPct}%</div>
                <div style={{ height: 5, background: 'var(--c-nested)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, overallBudgetPct)}%`, background: overallBudgetPct >= 100 ? 'var(--c-danger)' : overallBudgetPct >= 70 ? 'var(--c-gold)' : 'var(--c-sage)', transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 4 }}>
                  {formatCurrency(currentMonthExpenses.reduce((s, e) => s + e.amount, 0))} of {formatCurrency(budgets.budget_monthly)} this month
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: 'var(--c-text-4)', marginBottom: 8 }}>No budget set</div>
                <button onClick={() => setBudgetOpen(true)} style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-gold)', background: 'var(--c-gold-bg)', border: '1px solid var(--c-gold-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Set Budget →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Category breakdown ── */}
      {donutData.length > 0 && (
        <div style={{ ...sectionCard, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start' }}>
          <div className="max-sm:col-span-2">
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-2)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>Spending by Category</h3>
            <div style={{ width: 200, height: 200, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={85} dataKey="value" paddingAngle={2}
                    labelLine={false} label={<DonutCenterLabel total={totalSpent} />}>
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<DonutTooltipContent total={totalSpent} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="max-sm:col-span-2">
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-2)', margin: '0 0 12px', letterSpacing: '-0.01em' }}>Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {donutData.map(({ name, value, fill }) => {
                const pct = totalSpent > 0 ? (value / totalSpent) * 100 : 0
                const budgetKey = budgetKeyForCategory(name)
                const budget = budgets[budgetKey]
                const budgetPct = budget ? Math.min(100, Math.round((value / budget) * 100)) : null
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: fill, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)', flex: 1 }}>{name}</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: fill }}>{formatCurrency(value)}</span>
                      <span style={{ fontSize: 10, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", minWidth: 32, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--c-nested)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: fill, opacity: 0.7, transition: 'width 0.6s ease' }} />
                    </div>
                    {budget && budgetPct !== null && (
                      <div style={{ fontSize: 10, color: budgetPct >= 100 ? 'var(--c-danger)' : budgetPct >= 80 ? 'var(--c-gold)' : 'var(--c-text-5)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
                        Budget: {budgetPct}% used ({formatCurrency(value)} / {formatCurrency(budget)})
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Trend chart ── */}
      <div style={sectionCard}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-2)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>6-Month Trend</h3>
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend6Months} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--c-text-4)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--c-text-4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
              <Tooltip content={<TrendTooltipContent />} />
              <Bar dataKey="amount" name="Total" radius={[4, 4, 0, 0]}>
                {trend6Months.map((entry, i) => (
                  <Cell key={i} fill={entry.isCurrent ? 'var(--c-gold)' : '#3583b3'} opacity={entry.isCurrent ? 1 : 0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, justifyContent: 'center' }}>
          {[['Current month', 'var(--c-gold)'], ['Previous months', '#3583b3']].map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              <span style={{ fontSize: 11, color: 'var(--c-text-4)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expense list ── */}
      <div style={sectionCard}>
        {/* Filters row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 150 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-4)', pointerEvents: 'none' }} />
            <input
              type="text" placeholder="Search expenses..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--c-text-1)', borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 13, outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--c-sage-soft)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
          </div>
          {/* Category filter */}
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
            style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--c-text-2)', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
          {/* Group by */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--c-nested)', borderRadius: 8, padding: 3, border: '1px solid var(--c-border)' }}>
            {([['none', 'List'], ['date', 'By Date'], ['category', 'By Category']] as [GroupOption, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setGroupBy(val)}
                style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: groupBy === val ? 'var(--c-card)' : 'transparent',
                  color: groupBy === val ? 'var(--c-text-1)' : 'var(--c-text-4)',
                  boxShadow: groupBy === val ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses" description={search || filterCat ? 'Try adjusting your filters.' : 'Add your first expense for this period.'} action={!search && !filterCat ? { label: 'Add Expense', onClick: () => setAddOpen(true) } : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--c-nested)', borderBottom: '1px solid var(--c-border-mid)' }}>
                    {['Date', 'Category', 'Description', 'Amount', 'Tax', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedList.map(group => (
                    <React.Fragment key={group.key}>
                      {group.label && (
                        <tr>
                          <td colSpan={6} style={{ padding: '10px 14px 4px', fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.06em', textTransform: 'uppercase', background: 'var(--c-nested)', borderBottom: '1px solid var(--c-border)' }}>
                            {group.label}
                            {groupBy === 'category' && <span style={{ marginLeft: 8, color: CATEGORY_COLORS[group.key] ?? 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                              {formatCurrency(group.items.reduce((s, e) => s + e.amount, 0))}
                            </span>}
                          </td>
                        </tr>
                      )}
                      {group.items.map(e => (
                        <tr key={e.id} className="data-table group" style={{ borderBottom: '1px solid var(--c-border)', background: 'var(--c-card)', cursor: 'pointer' }}
                          onClick={() => setEditExpense(e)}>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--c-text-3)', whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace" }}>{formatDate(e.date)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[e.category] ?? '#6b7280', flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-2)' }}>{e.category}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--c-text-1)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description ?? <span style={{ color: 'var(--c-text-5)' }}>—</span>}</td>
                          <td style={{ padding: '10px 14px', fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--c-danger)', whiteSpace: 'nowrap' }}>{formatCurrency(e.amount)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            {e.tax_deductible !== false && <span style={{ fontSize: 10, color: 'var(--c-sage)', fontWeight: 600, fontFamily: "'DM Mono', monospace" }}>✓ Tax</span>}
                            {e.recurring && <span style={{ fontSize: 10, color: 'var(--c-gold)', fontWeight: 600, fontFamily: "'DM Mono', monospace", marginLeft: 4 }}>↻</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }} onClick={ev => ev.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }} className="group-hover:opacity-100">
                              <button onClick={() => setEditExpense(e)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-border)', background: 'transparent', cursor: 'pointer', color: 'var(--c-text-4)' }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setDeleteId(e.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: '1px solid var(--c-danger-border)', background: 'var(--c-danger-bg)', cursor: 'pointer', color: 'var(--c-danger)' }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {groupedList.map(group => (
                <React.Fragment key={group.key}>
                  {group.label && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-4)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 4px 2px' }}>
                      {group.label}
                      {groupBy === 'category' && <span style={{ marginLeft: 8, color: CATEGORY_COLORS[group.key] ?? 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>
                        {formatCurrency(group.items.reduce((s, e) => s + e.amount, 0))}
                      </span>}
                    </div>
                  )}
                  {group.items.map(e => (
                    <div key={e.id} onClick={() => setEditExpense(e)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 12, cursor: 'pointer', transition: 'transform 0.12s ease' }}
                      onTouchStart={ev => { (ev.currentTarget as HTMLElement).style.transform = 'scale(0.98)' }}
                      onTouchEnd={ev => { (ev.currentTarget as HTMLElement).style.transform = '' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${CATEGORY_COLORS[e.category] ?? '#6b7280'}18`, border: `1px solid ${CATEGORY_COLORS[e.category] ?? '#6b7280'}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                        {CATEGORY_ICONS[e.category] ?? '📦'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || e.category}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-4)', marginTop: 1, fontFamily: "'DM Mono', monospace" }}>{e.category} · {format(parseISO(e.date), 'MMM d')}</div>
                      </div>
                      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 800, color: 'var(--c-danger)' }}>{formatCurrency(e.amount)}</span>
                        <button onClick={ev => { ev.stopPropagation(); setDeleteId(e.id) }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, border: '1px solid var(--c-danger-border)', background: 'var(--c-danger-bg)', color: 'var(--c-danger)', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>

            {/* Sticky running total */}
            <div className="sticky-mobile-footer" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)' }}>
                  {filtered.length} expense{filtered.length !== 1 ? 's' : ''} showing
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 800, fontSize: 16, color: 'var(--c-danger)' }}>
                  {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <ExpenseForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={form => addMutation.mutate(form)}
        loading={addMutation.isPending}
        projects={projects}
        mode="add"
      />

      <ExpenseForm
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        onSave={form => editMutation.mutate(form)}
        loading={editMutation.isPending}
        projects={projects}
        initialValues={editInitialValues}
        mode="edit"
      />

      <BudgetModal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        current={budgets}
        onSave={data => budgetMutation.mutate(data)}
        loading={budgetMutation.isPending}
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete Expense"
        description="This will permanently remove this expense record."
      />
    </div>
  )
}
