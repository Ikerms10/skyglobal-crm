'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Download } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  subDays, subMonths, subYears, format, parseISO, differenceInDays,
  formatDistanceToNow,
} from 'date-fns'

// ── Local sub-components ─────────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; stroke: string; value: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border-bright)',
      borderRadius: 10, padding: '12px 16px', fontFamily: 'var(--font-ui)', fontSize: 12,
    }}>
      <p style={{
        fontFamily: 'var(--font-rajdhani)', fontWeight: 700, color: 'var(--sg-text-primary)',
        marginBottom: 6, fontSize: 14, margin: '0 0 6px',
      }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.stroke, margin: '2px 0', fontWeight: 600 }}>
          {p.name}: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.value)}
        </p>
      ))}
    </div>
  )
}

function MetricTile({ label, value, format: fmt, color }: {
  label: string
  value: number | string
  format: 'currency' | 'number' | 'percent' | 'text'
  color: string
}) {
  const displayRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (typeof value !== 'number' || hasAnimated.current || !displayRef.current) return
    hasAnimated.current = true
    const end = value
    const duration = 1000
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(2, -10 * t)
      const curr = end * ease
      if (displayRef.current) {
        displayRef.current.textContent = fmt === 'currency'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(curr)
          : fmt === 'percent' ? `${curr.toFixed(1)}%`
            : String(Math.round(curr))
      }
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, fmt])

  const displayValue = typeof value === 'string' ? value
    : fmt === 'currency' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
      : fmt === 'percent' ? `${(value as number).toFixed(1)}%`
        : String(Math.round(value as number))

  return (
    <div className="glass" style={{ padding: '16px', borderRadius: 10, borderTop: `3px solid ${color}` }}>
      <p style={{
        fontSize: 10, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)',
        letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px',
      }}>
        {label}
      </p>
      <span ref={displayRef} style={{
        fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 22, color,
        display: 'block',
      }}>
        {displayValue}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [range, setRange] = useState<'30d' | '90d' | '6mo' | '1yr'>('6mo')

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['analytics'],
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const [projRes, leadRes, expRes, projExpRes, actRes] = await Promise.all([
        supabase.from('projects')
          .select('id, title, contract_value, amount_paid, status, lead_cost, start_date, created_at, customer_id, customers(name, id)')
          .eq('user_id', user.id).is('deleted_at', null),
        supabase.from('leads')
          .select('id, stage, source, estimated_value, created_at, customer_id')
          .eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses')
          .select('id, amount, category, date')
          .eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses')
          .select('id, amount, date, project_id')
          .eq('user_id', user.id),
        supabase.from('activities')
          .select('id, type, content, created_at, customer_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(12),
      ])

      return {
        projects:     (projRes.data    ?? []) as any[],
        leads:        (leadRes.data    ?? []) as any[],
        expenses:     (expRes.data     ?? []) as any[],
        projExpenses: (projExpRes.data ?? []) as any[],
        activities:   (actRes.data     ?? []) as any[],
      }
    },
  })

  const rangeStart = useMemo(() => {
    const now = new Date()
    if (range === '30d') return subDays(now, 30)
    if (range === '90d') return subDays(now, 90)
    if (range === '6mo') return subMonths(now, 6)
    return subYears(now, 1)
  }, [range])

  // Revenue chart — last 12 months
  const revenueChartData = useMemo(() => {
    if (!rawData) return []
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i)
      const monthStr = format(d, 'yyyy-MM')
      const monthProjects = rawData.projects.filter((p: any) => {
        const pd = (p.start_date ?? p.created_at ?? '').slice(0, 7)
        return pd === monthStr && (p.status === 'In Progress' || p.status === 'Completed')
      })
      const collected   = monthProjects.reduce((s: number, p: any) => s + (p.amount_paid ?? 0), 0)
      const outstanding = monthProjects.reduce((s: number, p: any) => s + Math.max(0, (p.contract_value ?? 0) - (p.amount_paid ?? 0)), 0)
      return { month: format(d, 'MMM'), collected: Math.round(collected), outstanding: Math.round(outstanding) }
    })
  }, [rawData])

  // Funnel data
  const funnelData = useMemo(() => {
    if (!rawData) return []
    const filteredLeads = rawData.leads.filter((l: any) => l.created_at >= rangeStart.toISOString())
    const stages = ['New Lead', 'Estimate Sent', 'Follow-up', 'Won'] as const
    const counts = stages.map(s => filteredLeads.filter((l: any) => l.stage === s).length)
    const max = counts[0] || 1
    return stages.map((s, i) => ({
      stage: s,
      count: counts[i],
      pct: i === 0 ? 100 : Math.round((counts[i] / max) * 100),
      conversionFromPrev: i === 0 ? 100 : counts[i - 1] > 0 ? Math.round((counts[i] / counts[i - 1]) * 100) : 0,
      color: ['#7A9E7E', '#8B6914', '#8b5cf6', '#4A6741'][i],
    }))
  }, [rawData, rangeStart])

  // Revenue by source
  const sourceRevenue = useMemo(() => {
    if (!rawData) return []
    const map: Record<string, number> = {}
    const filteredLeads = rawData.leads.filter((l: any) => l.created_at >= rangeStart.toISOString())
    // Pre-build Map to avoid O(n×m) .find() inside forEach
    const projectByCustomer = new Map(rawData.projects.map((p: any) => [p.customer_id, p]))
    filteredLeads.forEach((l: any) => {
      const proj = projectByCustomer.get(l.customer_id)
      const val = proj?.contract_value ?? l.estimated_value ?? 0
      map[l.source] = (map[l.source] ?? 0) + val
    })
    const arr = Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value as number) }))
      .sort((a, b) => b.value - a.value)
    const maxVal = arr[0]?.value || 1
    return arr.map((item, i) => ({ ...item, isTop: i === 0, pct: Math.round(item.value / maxVal * 100) }))
  }, [rawData, rangeStart])

  // Monthly job count
  const jobCountData = useMemo(() => {
    if (!rawData) return []
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), 11 - i)
      const monthStr = format(d, 'yyyy-MM')
      const count = rawData.projects.filter((p: any) => (p.created_at ?? '').slice(0, 7) === monthStr).length
      return { month: format(d, 'MMM'), count }
    })
  }, [rawData])

  // Top customers
  const topCustomers = useMemo(() => {
    if (!rawData) return []
    const map: Record<string, { name: string; id: string; revenue: number; jobs: number }> = {}
    rawData.projects
      .filter((p: any) => p.created_at >= rangeStart.toISOString())
      .forEach((p: any) => {
        const c = Array.isArray(p.customers) ? p.customers[0] : (p.customers as { name: string; id: string } | null)
        if (!c) return
        if (!map[c.id]) map[c.id] = { name: c.name, id: c.id, revenue: 0, jobs: 0 }
        map[c.id].revenue += (p.contract_value ?? 0)
        map[c.id].jobs    += 1
      })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [rawData, rangeStart])

  // Key metrics
  const metrics = useMemo(() => {
    if (!rawData) return null
    const fp = rawData.projects.filter((p: any) => p.created_at >= rangeStart.toISOString())
    const fl = rawData.leads.filter((l: any) => l.created_at >= rangeStart.toISOString())
    const avgJobValue = fp.length > 0
      ? fp.reduce((s: number, p: any) => s + (p.contract_value ?? 0), 0) / fp.length : 0
    const wonLeads = fl.filter((l: any) => l.stage === 'Won').length
    const conversionRate = fl.length > 0 ? (wonLeads / fl.length) * 100 : 0
    const sourceMap: Record<string, number> = {}
    fl.forEach((l: any) => { sourceMap[l.source] = (sourceMap[l.source] ?? 0) + 1 })
    const topSource = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
    // Pre-build Map to avoid O(n×m) .find() inside map
    const projectByCustomerForMetrics = new Map(rawData.projects.map((p: any) => [p.customer_id, p]))
    const closedWithDays = fl
      .filter((l: any) => l.stage === 'Won')
      .map((l: any) => {
        const proj = projectByCustomerForMetrics.get(l.customer_id)
        if (!proj?.start_date) return null
        const days = differenceInDays(parseISO(proj.start_date), parseISO(l.created_at))
        return days >= 0 ? days : null
      })
      .filter((d: number | null): d is number => d !== null)
    const avgDaysToClose = closedWithDays.length > 0
      ? Math.round(closedWithDays.reduce((s: number, d: number) => s + d, 0) / closedWithDays.length) : 0
    return { avgJobValue, conversionRate, avgDaysToClose, topSource }
  }, [rawData, rangeStart])

  return (
    <div style={{ padding: '32px 24px', minHeight: '100vh', background: 'var(--sg-bg-base)' }}>
      <style>{`
        @media print {
          aside, header, nav, [class*="MobileNav"] { display: none !important; }
          .analytics-grid { grid-template-columns: 1fr !important; }
        }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Page header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 28,
            color: 'var(--sg-text-primary)', letterSpacing: '0.06em',
            textTransform: 'uppercase', margin: 0,
          }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)', margin: '2px 0 0' }}>
            Business performance overview
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Range pills */}
          <div style={{
            display: 'flex', gap: 2, padding: 3,
            background: 'var(--sg-bg-surface)', borderRadius: 10,
            border: '1px solid var(--sg-border)',
          }}>
            {(['30d', '90d', '6mo', '1yr'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                  background: range === r ? 'var(--sg-accent)' : 'transparent',
                  color: range === r ? '#fff' : 'var(--sg-text-secondary)',
                  transition: 'background 150ms, color 150ms',
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border-bright)',
              color: 'var(--sg-text-primary)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(122,158,126,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--sg-bg-elevated)' }}
            aria-label="Export as PDF"
          >
            <Download size={13} aria-hidden="true" /> Export PDF
          </button>
        </div>
      </div>

      {/* 2-col grid */}
      <div
        className="analytics-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}
      >
        {/* ── LEFT: Charts ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Chart 1: Revenue Pipeline */}
          <div className="glass" style={{ padding: '20px 24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 16, color: 'var(--sg-gold)',
              margin: '0 0 4px', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Revenue Pipeline
            </h3>
            <p style={{ fontSize: 11, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)', margin: '0 0 16px' }}>
              Last 12 months — Collected vs Outstanding
            </p>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
              {[['Collected', '#8B6914'], ['Outstanding', '#7A9E7E']].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} aria-hidden="true" />
                  <span style={{ fontSize: 10, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)' }}>{l}</span>
                </div>
              ))}
            </div>
            {isLoading ? (
              <div className="skeleton" style={{ height: 280 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8B6914" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B6914" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7A9E7E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7A9E7E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--sg-text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--sg-text-muted)', fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `$${((v as number) / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,105,20,0.08)" vertical={false} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area type="monotone" dataKey="collected"   name="Collected"   stroke="#8B6914" strokeWidth={2} fill="url(#goldGrad)" animationDuration={1800} />
                  <Area type="monotone" dataKey="outstanding" name="Outstanding" stroke="#7A9E7E" strokeWidth={2} fill="url(#blueGrad)" animationDuration={1800} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 2: Lead Conversion Funnel */}
          <div className="glass" style={{ padding: '20px 24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 16,
              color: 'var(--sg-text-primary)', margin: '0 0 16px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Lead Conversion Funnel
            </h3>
            {isLoading ? (
              <div className="skeleton" style={{ height: 140 }} />
            ) : funnelData.length === 0 ? (
              <p style={{ color: 'var(--sg-text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '20px 0' }}>
                No lead data for this period
              </p>
            ) : (
              <div style={{ padding: '0 8px' }}>
                {funnelData.map((stage, i) => (
                  <div key={stage.stage} style={{
                    marginBottom: i < funnelData.length - 1 ? 4 : 0,
                    animation: 'fadeSlideUp 0.4s ease both',
                    animationDelay: `${i * 0.1}s`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                      <span style={{ color: 'var(--sg-text-secondary)', fontFamily: 'var(--font-ui)' }}>{stage.stage}</span>
                      <span style={{ color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {stage.count}{i > 0 ? ` (${stage.conversionFromPrev}% from prev)` : ''}
                      </span>
                    </div>
                    <div style={{
                      height: 28, background: 'rgba(14,20,32,0.6)', borderRadius: 4, overflow: 'hidden',
                      border: '1px solid var(--sg-border)', position: 'relative',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: `linear-gradient(90deg, ${stage.color}, ${stage.color}aa)`,
                        width: `${stage.pct}%`,
                        transition: 'width 0.8s ease',
                        display: 'flex', alignItems: 'center', paddingLeft: 8,
                        boxShadow: `0 0 12px ${stage.color}44`,
                      }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#fff',
                          fontFamily: 'var(--font-rajdhani)', textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                        }}>
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart 3: Revenue by Source */}
          <div className="glass" style={{ padding: '20px 24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 16,
              color: 'var(--sg-text-primary)', margin: '0 0 16px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Revenue by Source
            </h3>
            {isLoading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : sourceRevenue.length === 0 ? (
              <p style={{ color: 'var(--sg-text-muted)', fontSize: 13, fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '20px 0' }}>
                No source data for this period
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, sourceRevenue.length * 36)}>
                <BarChart data={sourceRevenue} layout="vertical" margin={{ top: 0, right: 60, left: 80, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fill: 'var(--sg-text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }}
                    axisLine={false} tickLine={false} width={70}
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v),
                      'Revenue',
                    ]}
                    contentStyle={{ background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--sg-text-primary)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} animationBegin={200} animationDuration={1200}>
                    {sourceRevenue.map((entry, i) => (
                      <Cell key={i} fill={entry.isTop ? '#8B6914' : '#7A9E7E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart 4: Monthly Jobs */}
          <div className="glass" style={{ padding: '20px 24px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 16,
              color: 'var(--sg-text-primary)', margin: '0 0 16px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Monthly Jobs
            </h3>
            {isLoading ? (
              <div className="skeleton" style={{ height: 160 }} />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={jobCountData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'var(--sg-text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fill: 'var(--sg-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,105,20,0.08)" vertical={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--sg-text-primary)', fontFamily: 'var(--font-rajdhani)' }}
                  />
                  <Line
                    type="monotone" dataKey="count" stroke="var(--sg-accent)" strokeWidth={2}
                    dot={{ fill: 'var(--sg-accent)', r: 3 }} animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Key Metrics 2×2 */}
          <div className="glass" style={{ padding: '16px 20px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 14,
              color: 'var(--sg-text-primary)', margin: '0 0 12px',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Key Metrics
            </h3>
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <MetricTile label="Avg Job Value"     value={metrics?.avgJobValue ?? 0}    format="currency" color="var(--sg-gold)" />
                <MetricTile label="Conversion Rate"   value={metrics?.conversionRate ?? 0} format="percent"  color="var(--sg-success)" />
                <MetricTile label="Avg Days to Close" value={metrics?.avgDaysToClose ?? 0} format="number"   color="var(--sg-accent)" />
                <MetricTile label="Top Source"        value={metrics?.topSource ?? '—'}    format="text"     color="var(--sg-text-secondary)" />
              </div>
            )}
          </div>

          {/* Top Customers */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--c-card)',
            border: '1px solid var(--c-border-light)',
            borderRadius: 12,
            boxShadow: 'var(--s-card)',
          }}>
            <h3 style={{
              fontWeight: 700, fontSize: 13,
              color: 'var(--c-text-1)', margin: '0 0 12px',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Top Customers
            </h3>
            {isLoading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topCustomers.map((c, i) => {
                  const maxRev = topCustomers[0]?.revenue || 1
                  return (
                    <div key={c.id} style={{
                      position: 'relative', padding: '10px 12px', borderRadius: 8, overflow: 'hidden',
                      background: 'var(--c-nested)', border: '1px solid var(--c-border-light)',
                      transition: 'background 150ms',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--c-sidebar-hover)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--c-nested)' }}
                    >
                      {/* Background revenue bar */}
                      <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8,
                        background: i === 0
                          ? 'linear-gradient(90deg, rgba(139,105,20,0.10), transparent)'
                          : 'linear-gradient(90deg, rgba(74,103,65,0.07), transparent)',
                        width: `${Math.round(c.revenue / maxRev * 100)}%`,
                        transition: 'width 0.8s ease',
                      }} aria-hidden="true" />
                      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: 14,
                            color: 'var(--c-gold)',
                          }} aria-hidden="true">
                            {i === 0 ? '👑' : `#${i + 1}`}
                          </span>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text-1)', margin: 0 }}>
                              {c.name}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace", margin: 0 }}>
                              {c.jobs} job{c.jobs !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <span style={{
                          fontFamily: "'DM Mono', monospace", fontWeight: i === 0 ? 700 : 600, fontSize: 14,
                          color: i === 0 ? 'var(--c-gold)' : 'var(--c-text-1)',
                        }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(c.revenue)}
                        </span>
                      </div>
                    </div>
                  )
                })}
                {topCustomers.length === 0 && (
                  <p style={{ color: 'var(--c-text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                    No data yet
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="glass" style={{ padding: '16px 20px' }}>
            <h3 style={{
              fontFamily: 'var(--font-rajdhani)', fontWeight: 700, fontSize: 14,
              color: 'var(--sg-text-primary)', margin: '0 0 4px',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Live Activity
            </h3>
            <p style={{ fontSize: 10, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 12px' }}>
              Recent CRM actions
            </p>
            {isLoading ? (
              <div className="skeleton" style={{ height: 200 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(rawData?.activities ?? []).slice(0, 10).map((a: any) => {
                  const typeColors: Record<string, string> = {
                    Call: 'var(--sg-accent)', Email: 'var(--sg-success)', Note: 'var(--sg-gold)',
                    Visit: '#8b5cf6', Text: 'var(--sg-text-secondary)',
                  }
                  const color = typeColors[a.type] ?? 'var(--sg-text-muted)'
                  return (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
                      borderBottom: '1px solid var(--sg-border)',
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', background: color,
                        flexShrink: 0, marginTop: 5,
                      }} aria-hidden="true" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sg-text-primary)', fontFamily: 'var(--font-ui)', margin: 0 }}>
                          {a.type}
                        </p>
                        {a.content && (
                          <p style={{
                            fontSize: 11, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-ui)',
                            margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {a.content}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--sg-text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {formatDistanceToNow(parseISO(a.created_at), { addSuffix: false }).replace('about ', '')}
                      </span>
                    </div>
                  )
                })}
                {(rawData?.activities ?? []).length === 0 && (
                  <p style={{ color: 'var(--sg-text-muted)', fontSize: 12, fontFamily: 'var(--font-ui)', textAlign: 'center', padding: '16px 0' }}>
                    No recent activity
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
