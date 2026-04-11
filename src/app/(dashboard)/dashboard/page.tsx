'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { formatDistanceToNow, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, Briefcase, Target, TrendingUp, ArrowRight, Clock, AlertTriangle, Activity } from 'lucide-react'
import Link from 'next/link'
import { BibleVerse } from '@/components/dashboard/BibleVerse'
import { WeatherWidget } from '@/components/dashboard/WeatherWidget'
import { DailyBriefing } from '@/components/dashboard/DailyBriefing'

type Timeframe = 'Week' | 'Month' | 'Year' | 'All'

function getStartDate(tf: Timeframe): string | null {
  const now = new Date()
  if (tf === 'Week')  return startOfWeek(now).toISOString()
  if (tf === 'Month') return startOfMonth(now).toISOString()
  if (tf === 'Year')  return startOfYear(now).toISOString()
  return null
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; color: string; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-card)',
      borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: 13,
    }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'This Week',  value: 'Week' },
  { label: 'This Month', value: 'Month' },
  { label: 'This Year',  value: 'Year' },
  { label: 'All Time',   value: 'All' },
]

const STAGE_COLORS: Record<string, string> = {
  'New Lead':      '#3583b3',
  'Estimate Sent': '#e6ab35',
  'Follow-up':     '#bf5af2',
  'Won':           '#30d158',
  'Lost':          '#ff453a',
  'On Hold':       '#6e6e73',
}

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Month')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', timeframe],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const startDate = getStartDate(timeframe)
      const fallbackId = '00000000-0000-0000-0000-000000000000'

      const [projectsRes, leadsRes, expensesRes, projectExpensesRes, activitiesRes] = await Promise.all([
        supabase.from('projects')
          .select('id, contract_value, amount_paid, payment_status, status, created_at, customer_id, title, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase.from('leads')
          .select('id, stage, source, estimated_value, follow_up_date, title, customer_id, created_at')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? fallbackId),
        supabase.from('expenses')
          .select('id, amount, category, date')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'date' : 'id', startDate ? startDate.split('T')[0] : fallbackId),
        supabase.from('project_expenses').select('id, amount, date').eq('user_id', user.id),
        supabase.from('activities')
          .select('id, type, content, created_at, customer_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(8),
      ])

      const projects = projectsRes.data ?? []
      const leads = leadsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const projExp = projectExpensesRes.data ?? []

      const revenue = projects
        .filter(p => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0)
      const totalExpenses = [...expenses.map(e => e.amount), ...projExp.map(e => e.amount)]
        .reduce((s, a) => s + a, 0)
      const profit = revenue - totalExpenses
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

      // 6-month chart
      const [allProjRes, allExpRes, allProjExpRes] = await Promise.all([
        supabase.from('projects').select('contract_value, created_at, status').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses').select('amount, date').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses').select('amount, date').eq('user_id', user.id),
      ])

      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i)
        const m = d.toLocaleDateString('en-US', { month: 'short' })
        const yr = d.getFullYear()
        const rev = (allProjRes.data ?? [])
          .filter(p => {
            const pd = new Date(p.created_at)
            return pd.toLocaleDateString('en-US', { month: 'short' }) === m && pd.getFullYear() === yr
              && (p.status === 'In Progress' || p.status === 'Completed')
          })
          .reduce((s, p) => s + (p.contract_value ?? 0), 0)
        const exp = [
          ...(allExpRes.data ?? []).filter(e => { const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr }).map(e => e.amount),
          ...(allProjExpRes.data ?? []).filter(e => { const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === m && ed.getFullYear() === yr }).map(e => e.amount),
        ].reduce((s, a) => s + a, 0)
        return { month: m, revenue: Math.round(rev), expenses: Math.round(exp) }
      })

      const stages = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won', 'Lost', 'On Hold']
      const stageCounts = Object.fromEntries(stages.map(s => [s, leads.filter(l => l.stage === s).length]))

      const today = new Date().toISOString().split('T')[0]
      const [followUpsRes, overdueRes] = await Promise.all([
        supabase.from('leads')
          .select('id, title, follow_up_date, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .lte('follow_up_date', subMonths(new Date(), -1).toISOString().split('T')[0])
          .gte('follow_up_date', today)
          .not('stage', 'in', '("Won","Lost")')
          .order('follow_up_date', { ascending: true }).limit(5),
        supabase.from('projects')
          .select('id, title, contract_value, amount_paid, customer_id, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .in('payment_status', ['Unpaid', 'Partial', 'Overdue'])
          .lt('end_date', today).limit(4),
      ])

      const activeProjectsList = projects.filter(p => p.status === 'In Progress').slice(0, 4)

      return {
        revenue, totalExpenses, profit, margin,
        wonLeads: leads.filter(l => l.stage === 'Won').length,
        totalLeads: leads.length,
        activeProjects: projects.filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length,
        chartData, stageCounts,
        activities: activitiesRes.data ?? [],
        followUps: followUpsRes.data ?? [],
        overdue: overdueRes.data ?? [],
        activeProjectsList,
      }
    },
    staleTime: 60_000,
  })

  const maxStageCount = Math.max(...Object.values(data?.stageCounts ?? {}).map(Number), 1)

  const kpis = [
    { label: 'Total Revenue',    value: formatCurrency(data?.revenue),      sub: null,                                     icon: DollarSign, href: '/reports' },
    { label: 'Gross Profit',     value: formatCurrency(data?.profit),       sub: data?.margin != null ? `${data.margin}% margin` : null, icon: TrendingUp, href: '/reports' },
    { label: 'Active Projects',  value: String(data?.activeProjects ?? 0),  sub: null,                                     icon: Briefcase,  href: '/projects' },
    { label: 'Leads',            value: String(data?.totalLeads ?? 0),      sub: data?.wonLeads != null ? `${data.wonLeads} won` : null,  icon: Target,     href: '/leads' },
  ]

  // Inline card style
  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
  }

  return (
    <div style={{ padding: '40px', maxWidth: 1240, margin: '0 auto' }} className="p-4 md:p-8 md:p-10 animate-fade-up">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            {greeting()}, Iker 👋
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            {todayLabel()} · Orlando, FL
          </p>
        </div>
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}>
          {TIMEFRAMES.map(tf => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={{
                padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: timeframe === tf.value ? 600 : 450,
                background: timeframe === tf.value ? 'var(--gold)' : 'transparent',
                color: timeframe === tf.value ? 'var(--text-inverse)' : 'var(--text-secondary)',
                transition: 'background 150ms, color 150ms',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── ROW 1: Bible verse ────────────────────────────────────────── */}
        <BibleVerse />

        {/* ── ROW 2: Weather + Briefing ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '38% 1fr', gap: 16 }} className="grid-cols-1 md:grid-cols-[38%_1fr]">
          <WeatherWidget />
          <DailyBriefing />
        </div>

        {/* ── ROW 3: KPI Cards ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="grid-cols-2 md:grid-cols-4">
          {kpis.map(({ label, value, sub, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              style={{ ...card, display: 'block', textDecoration: 'none', transition: 'transform 200ms, box-shadow 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              {isLoading ? (
                <div className="skeleton-shimmer" style={{ height: 56, borderRadius: 8 }} />
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    <Icon size={15} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
                    {value}
                  </p>
                  {sub && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</p>}
                </>
              )}
            </Link>
          ))}
        </div>

        {/* ── ROW 4: Charts ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 16 }} className="grid-cols-1 md:grid-cols-[60%_1fr]">
          {/* Line chart */}
          <div style={card}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Revenue vs Expenses</h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Last 6 months</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{ c: '#e6ab35', n: 'Revenue' }, { c: '#3583b3', n: 'Expenses' }].map(({ c, n }) => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
            {isLoading ? (
              <div className="skeleton-shimmer" style={{ height: 200, borderRadius: 8 }} />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.chartData ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line dataKey="revenue" name="Revenue" stroke="#e6ab35" strokeWidth={2} dot={false} type="monotone" />
                  <Line dataKey="expenses" name="Expenses" stroke="#3583b3" strokeWidth={2} dot={false} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pipeline */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Pipeline</h3>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{data?.totalLeads ?? 0} leads</p>
              </div>
              <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                View <ArrowRight size={12} />
              </Link>
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: 28, borderRadius: 6 }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(data?.stageCounts ?? {}).filter(([, count]) => Number(count) > 0).map(([stage, count]) => (
                  <div key={stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{stage}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-tertiary)' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: STAGE_COLORS[stage] ?? 'var(--text-tertiary)',
                        width: `${Math.round((Number(count) / maxStageCount) * 100)}%`,
                        transition: 'width 600ms var(--ease-smooth)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── ROW 5: Activity + Follow-ups + Overdue ────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
          {/* Activity */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</h3>
              <Activity size={14} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: 36, borderRadius: 6 }} />)}
              </div>
            ) : (data?.activities ?? []).length > 0 ? (
              <div>
                {(data!.activities as Array<{ id: string; type: string; content: string | null; created_at: string; customer_id: string }>).map(a => (
                  <Link key={a.id} href={a.customer_id ? `/customers/${a.customer_id}` : '#'}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-strong)', flexShrink: 0, marginTop: 6 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{a.type}</p>
                      {a.content && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</p>}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: false }).replace('about ', '')}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No recent activity</p>
            )}
          </div>

          {/* Follow-ups */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Upcoming Follow-ups</h3>
              <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            {(data?.followUps ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(data!.followUps as Array<{ id: string; title: string; follow_up_date: string | null; customers: { name: string } | null }>).map(f => {
                  const isToday = f.follow_up_date === new Date().toISOString().split('T')[0]
                  return (
                    <Link key={f.id} href="/leads" style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 12px', background: 'var(--bg-tertiary)', borderRadius: 10,
                      textDecoration: 'none', transition: 'background 100ms',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{(f.customers as { name: string } | null)?.name}</p>
                      </div>
                      <span style={{ fontSize: 11, color: isToday ? 'var(--gold)' : 'var(--text-tertiary)', fontWeight: isToday ? 600 : 400, flexShrink: 0, marginLeft: 8 }}>
                        {isToday ? 'Today' : f.follow_up_date}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No upcoming follow-ups</p>
            )}
          </div>

          {/* Overdue + Active Projects */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Overdue Payments</h3>
              <AlertTriangle size={14} style={{ color: 'var(--error)' }} />
            </div>
            {(data?.overdue ?? []).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(data!.overdue as Array<{ id: string; title: string; customer_id: string; contract_value: number | null; amount_paid: number; customers: { name: string } | null }>).map(p => (
                  <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '9px 12px', background: 'var(--error-light)', borderRadius: 10, textDecoration: 'none',
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{(p.customers as { name: string } | null)?.name}</p>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                      {formatCurrency((p.contract_value ?? 0) - p.amount_paid)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>✓ No overdue payments</p>
                {/* Active projects mini list */}
                {(data?.activeProjectsList ?? []).length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 10px', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Active Projects</span>
                      <Link href="/projects" style={{ fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                    {(data!.activeProjectsList as Array<{ id: string; title: string; contract_value: number | null; customer_id: string; customers: { name: string } | null }>).map(p => (
                      <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} style={{
                        display: 'flex', justifyContent: 'space-between', padding: '7px 0',
                        borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none',
                      }}>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{p.title}</p>
                        <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{formatCurrency(p.contract_value)}</span>
                      </Link>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
