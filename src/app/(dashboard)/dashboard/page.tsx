'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatDistanceToNow, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import {
  LineChart, Line, XAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, Briefcase, Target, TrendingUp, TrendingDown, ArrowRight, Clock, AlertTriangle, Activity } from 'lucide-react'
import Link from 'next/link'

type Timeframe = 'Week' | 'Month' | 'Year' | 'All'

function getStartDate(tf: Timeframe): string | null {
  const now = new Date()
  if (tf === 'Week')  return startOfWeek(now).toISOString()
  if (tf === 'Month') return startOfMonth(now).toISOString()
  if (tf === 'Year')  return startOfYear(now).toISOString()
  return null
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; color: string; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
      fontSize: 13,
    }}>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
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
      const dateFilter = startDate ?? '00000000-0000-0000-0000-000000000000'

      const [projectsRes, leadsRes, expensesRes, projectExpensesRes, activitiesRes] = await Promise.all([
        supabase.from('projects')
          .select('id, contract_value, amount_paid, payment_status, status, created_at, customer_id, title, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', dateFilter),
        supabase.from('leads')
          .select('id, stage, source, estimated_value, follow_up_date, title, customer_id, created_at')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', dateFilter),
        supabase.from('expenses')
          .select('id, amount, category, date')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'date' : 'id', startDate ? startDate.split('T')[0] : dateFilter),
        supabase.from('project_expenses')
          .select('id, amount, category, date, project_id')
          .eq('user_id', user.id),
        supabase.from('activities')
          .select('id, type, content, created_at, customer_id, project_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      const projects = projectsRes.data ?? []
      const leads = leadsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const projectExpenses = projectExpensesRes.data ?? []
      const activities = activitiesRes.data ?? []

      const revenue = projects
        .filter(p => p.status === 'In Progress' || p.status === 'Completed')
        .reduce((s, p) => s + (p.contract_value ?? 0), 0)
      const totalExpenses = [...expenses.map(e => e.amount), ...projectExpenses.map(e => e.amount)]
        .reduce((s, a) => s + a, 0)
      const profit = revenue - totalExpenses
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
      const wonLeads = leads.filter(l => l.stage === 'Won').length
      const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length

      // 6-month chart data
      const [allProjectsRes, allExpensesRes, allProjExpRes] = await Promise.all([
        supabase.from('projects').select('contract_value, created_at, status').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses').select('amount, date').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses').select('amount, date').eq('user_id', user.id),
      ])

      const chartData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i)
        const month = d.toLocaleDateString('en-US', { month: 'short' })
        const yr = d.getFullYear()
        const rev = (allProjectsRes.data ?? [])
          .filter(p => {
            const pd = new Date(p.created_at)
            return pd.toLocaleDateString('en-US', { month: 'short' }) === month && pd.getFullYear() === yr
              && (p.status === 'In Progress' || p.status === 'Completed')
          })
          .reduce((s, p) => s + (p.contract_value ?? 0), 0)
        const exp = [
          ...(allExpensesRes.data ?? []).filter(e => {
            const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === month && ed.getFullYear() === yr
          }).map(e => e.amount),
          ...(allProjExpRes.data ?? []).filter(e => {
            const ed = new Date(e.date); return ed.toLocaleDateString('en-US', { month: 'short' }) === month && ed.getFullYear() === yr
          }).map(e => e.amount),
        ].reduce((s, a) => s + a, 0)
        return { month, revenue: Math.round(rev), expenses: Math.round(exp) }
      })

      // Pipeline summary
      const stages = ['New Lead', 'Estimate Sent', 'Follow-up', 'Negotiating', 'Won', 'Lost'] as const
      const stageCounts = Object.fromEntries(stages.map(s => [s, leads.filter(l => l.stage === s).length]))

      const today = new Date().toISOString().split('T')[0]
      const [followUpsRes, overdueRes] = await Promise.all([
        supabase.from('leads')
          .select('id, title, follow_up_date, stage, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .lte('follow_up_date', subMonths(new Date(), -1).toISOString().split('T')[0])
          .gte('follow_up_date', today)
          .not('stage', 'in', '("Won","Lost")')
          .order('follow_up_date', { ascending: true })
          .limit(4),
        supabase.from('projects')
          .select('id, title, contract_value, amount_paid, payment_status, customer_id, customers(name)')
          .eq('user_id', user.id).is('deleted_at', null)
          .in('payment_status', ['Unpaid', 'Partial', 'Overdue'])
          .lt('end_date', today)
          .limit(4),
      ])

      return {
        revenue, totalExpenses, profit, margin,
        wonLeads, totalLeads: leads.length, activeProjects,
        chartData, stageCounts,
        activities,
        followUps: followUpsRes.data ?? [],
        overdue: overdueRes.data ?? [],
        activeProjectsList: projects.filter(p => p.status === 'In Progress').slice(0, 4),
      }
    },
    staleTime: 60_000,
  })

  const TIMEFRAMES: { label: string; value: Timeframe }[] = [
    { label: 'This Week', value: 'Week' },
    { label: 'This Month', value: 'Month' },
    { label: 'This Year', value: 'Year' },
    { label: 'All Time', value: 'All' },
  ]

  const kpis = [
    {
      label: 'Total Revenue',
      value: formatCurrency(data?.revenue),
      icon: DollarSign,
      trend: null,
      href: '/reports',
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(data?.profit),
      sub: data?.margin != null ? `${data.margin}% margin` : null,
      icon: TrendingUp,
      positive: (data?.profit ?? 0) >= 0,
      href: '/reports',
    },
    {
      label: 'Active Projects',
      value: String(data?.activeProjects ?? 0),
      icon: Briefcase,
      href: '/projects',
    },
    {
      label: 'Leads',
      value: String(data?.totalLeads ?? 0),
      sub: data?.wonLeads != null ? `${data.wonLeads} won` : null,
      icon: Target,
      href: '/leads',
    },
  ]

  const STAGE_COLORS: Record<string, string> = {
    'New Lead': 'var(--blue)',
    'Estimate Sent': 'var(--gold)',
    'Follow-up': 'var(--warning)',
    'Negotiating': '#8b5cf6',
    'Won': 'var(--success)',
    'Lost': 'var(--error)',
  }

  const maxStageCount = Math.max(...Object.values(data?.stageCounts ?? {}).map(Number), 1)

  return (
    <div style={{ padding: '32px', maxWidth: 1200, margin: '0 auto' }} className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            {greeting()}, Iker
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>{todayLabel()}</p>
        </div>
        {/* Timeframe toggle */}
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
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
                color: timeframe === tf.value ? 'var(--gold-text)' : 'var(--text-secondary)',
                transition: 'all 150ms',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {kpis.map(({ label, value, sub, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            style={{
              display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)', padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)', textDecoration: 'none',
              transition: 'transform 200ms, box-shadow 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            {isLoading ? (
              <div className="skeleton-shimmer" style={{ height: 56, borderRadius: 8 }} />
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
                  <Icon size={16} style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>
                  {value}
                </p>
                {sub && (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</p>
                )}
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Second row: Chart + Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid-cols-1 lg:grid-cols-2">
        {/* Revenue Line Chart */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Revenue vs Expenses</h3>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Last 6 months</p>
          </div>
          {isLoading ? (
            <div className="skeleton-shimmer" style={{ height: 200, borderRadius: 8 }} />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Revenue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Expenses</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.chartData ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line dataKey="revenue" name="Revenue" stroke="#e6ab35" strokeWidth={2} dot={false} type="monotone" />
                  <Line dataKey="expenses" name="Expenses" stroke="#3583b3" strokeWidth={2} dot={false} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Pipeline Summary */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Pipeline</h3>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{data?.totalLeads ?? 0} total leads</p>
            </div>
            <Link href="/leads" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer" style={{ height: 32, borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(data?.stageCounts ?? {}).map(([stage, count]) => (
                count > 0 && (
                  <div key={stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{stage}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-secondary)' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: STAGE_COLORS[stage] ?? 'var(--text-tertiary)',
                        width: `${Math.round((Number(count) / maxStageCount) * 100)}%`,
                        transition: 'width 500ms var(--ease-smooth)',
                      }} />
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Third row: Activity + Follow-ups + Projects */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
        {/* Recent Activity */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Activity</h3>
            <Activity size={14} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: 40, borderRadius: 6 }} />)}
            </div>
          ) : data?.activities && data.activities.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {data.activities.map((a: { id: string; type: string; content: string | null; created_at: string; customer_id: string }) => (
                <Link
                  key={a.id}
                  href={a.customer_id ? `/customers/${a.customer_id}` : '#'}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                    textDecoration: 'none', transition: 'opacity 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--border-subtle)', flexShrink: 0, marginTop: 5 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{a.type}</p>
                    {a.content && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, marginTop: 2 }}>
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: false }).replace('about ', '').replace('less than a minute', '1m')}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No recent activity</p>
          )}
        </div>

        {/* Follow-ups */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Follow-ups</h3>
            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: 48, borderRadius: 8 }} />)}
            </div>
          ) : data?.followUps && data.followUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data.followUps as Array<{ id: string; title: string; follow_up_date: string | null; customers: { name: string } | null }>).map(f => {
                const isToday = f.follow_up_date === new Date().toISOString().split('T')[0]
                return (
                  <Link key={f.id} href="/leads" style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    background: 'var(--bg-secondary)', borderRadius: 10, textDecoration: 'none',
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated, #3a3a3c)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: isToday ? 'var(--gold)' : 'var(--border-subtle)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{(f.customers as { name: string } | null)?.name}</p>
                    </div>
                    <span style={{ fontSize: 11, color: isToday ? 'var(--gold)' : 'var(--text-tertiary)', fontWeight: isToday ? 600 : 400 }}>
                      {isToday ? 'Today' : formatDate(f.follow_up_date)}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No upcoming follow-ups</p>
          )}
          {data?.overdue && data.overdue.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '16px 0 8px' }}>
                <AlertTriangle size={12} style={{ color: 'var(--error)' }} />
                <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>Overdue payments</span>
              </div>
              {(data.overdue as Array<{ id: string; title: string; customer_id: string; contract_value: number | null; amount_paid: number; customers: { name: string } | null }>).map(p => (
                <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                  background: 'var(--error-light)', borderRadius: 10, textDecoration: 'none', marginBottom: 4,
                }}>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{p.title}</p>
                  <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600 }}>
                    {formatCurrency((p.contract_value ?? 0) - p.amount_paid)}
                  </span>
                </Link>
              ))}
            </>
          )}
        </div>

        {/* Active Projects */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)', padding: '20px 24px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Active Projects</h3>
            <Link href="/projects" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              <ArrowRight size={12} />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-shimmer" style={{ height: 56, borderRadius: 8 }} />)}
            </div>
          ) : data?.activeProjectsList && data.activeProjectsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(data.activeProjectsList as Array<{ id: string; title: string; contract_value: number | null; customer_id: string; customers: { name: string } | null }>).map(p => {
                return (
                  <Link key={p.id} href={`/customers/${p.customer_id}/projects/${p.id}`} style={{
                    display: 'block', padding: '10px 12px',
                    background: 'var(--bg-secondary)', borderRadius: 10, textDecoration: 'none',
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated, #3a3a3c)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{p.title}</p>
                      <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600, marginLeft: 8, flexShrink: 0 }}>
                        {formatCurrency(p.contract_value)}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
                      {(p.customers as { name: string } | null)?.name}
                    </p>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', padding: '24px 0' }}>No active projects</p>
          )}
        </div>
      </div>
    </div>
  )
}
