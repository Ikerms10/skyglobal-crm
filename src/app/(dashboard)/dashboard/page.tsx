'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton'
import { formatDistanceToNow, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, DollarSign, Target, Briefcase, Activity, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Timeframe = 'Weekly' | 'Monthly' | 'Yearly' | 'All Time'

function getStartDate(timeframe: Timeframe): string | null {
  const now = new Date()
  switch (timeframe) {
    case 'Weekly': return startOfWeek(now).toISOString()
    case 'Monthly': return startOfMonth(now).toISOString()
    case 'Yearly': return startOfYear(now).toISOString()
    case 'All Time': return null
  }
}

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('Monthly')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', timeframe],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const startDate = getStartDate(timeframe)

      const [projectsRes, leadsRes, expensesRes, projectExpensesRes, activitiesRes] = await Promise.all([
        supabase.from('projects')
          .select('id, contract_value, amount_paid, payment_status, status, created_at, type')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? '00000000-0000-0000-0000-000000000000'),
        supabase.from('leads')
          .select('id, stage, source, estimated_value, follow_up_date, title, customer_id, created_at')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'created_at' : 'id', startDate ?? '00000000-0000-0000-0000-000000000000'),
        supabase.from('expenses')
          .select('id, amount, category, date')
          .eq('user_id', user.id).is('deleted_at', null)
          .gte(startDate ? 'date' : 'id', startDate ? startDate.split('T')[0] : '00000000-0000-0000-0000-000000000000'),
        supabase.from('project_expenses')
          .select('id, amount, category, date, project_id')
          .eq('user_id', user.id),
        supabase.from('activities')
          .select('id, type, content, created_at, customer_id, project_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const projects = projectsRes.data ?? []
      const leads = leadsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const projectExpenses = projectExpensesRes.data ?? []
      const activities = activitiesRes.data ?? []

      const revenue = projects.reduce((sum, p) => sum + (p.contract_value ?? 0), 0)
      const totalExpenses = [
        ...expenses.map(e => e.amount),
        ...projectExpenses.map(e => e.amount),
      ].reduce((sum, a) => sum + a, 0)
      const profit = revenue - totalExpenses
      const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0

      const wonLeads = leads.filter(l => l.stage === 'Won').length
      const totalLeads = leads.length
      const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0
      const activeProjects = projects.filter(p => p.status === 'In Progress' || p.status === 'Scheduled').length

      const adSpend = expenses.filter(e => e.category === 'Advertising').reduce((sum, e) => sum + e.amount, 0)
      const avgLeadCost = totalLeads > 0 ? adSpend / totalLeads : 0
      const revenuePerLead = totalLeads > 0 ? revenue / totalLeads : 0
      const revenuePerWon = wonLeads > 0 ? revenue / wonLeads : 0

      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i)
        const month = d.toLocaleDateString('en-US', { month: 'short' })
        const year = d.getFullYear()
        return { month, year }
      })

      const [allProjectsRes, allExpensesRes, allProjExpRes] = await Promise.all([
        supabase.from('projects').select('contract_value, created_at').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses').select('amount, date, category').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses').select('amount, date').eq('user_id', user.id),
      ])

      const barChartData = monthlyData.map(({ month, year }) => {
        const rev = (allProjectsRes.data ?? [])
          .filter(p => {
            const d = new Date(p.created_at)
            return d.toLocaleDateString('en-US', { month: 'short' }) === month && d.getFullYear() === year
          })
          .reduce((sum, p) => sum + (p.contract_value ?? 0), 0)
        const exp = [
          ...(allExpensesRes.data ?? []).filter(e => {
            const d = new Date(e.date)
            return d.toLocaleDateString('en-US', { month: 'short' }) === month && d.getFullYear() === year
          }).map(e => e.amount),
          ...(allProjExpRes.data ?? []).filter(e => {
            const d = new Date(e.date)
            return d.toLocaleDateString('en-US', { month: 'short' }) === month && d.getFullYear() === year
          }).map(e => e.amount),
        ].reduce((sum, a) => sum + a, 0)
        return { month, revenue: Math.round(rev), expenses: Math.round(exp) }
      })

      const sourceCounts: Record<string, number> = {}
      leads.forEach(l => { sourceCounts[l.source] = (sourceCounts[l.source] ?? 0) + 1 })
      const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value }))

      const expCats: Record<string, number> = {}
      expenses.forEach(e => { expCats[e.category] = (expCats[e.category] ?? 0) + e.amount })
      const expCatData = Object.entries(expCats).map(([name, value]) => ({ name, value: Math.round(value) }))

      const today = new Date().toISOString().split('T')[0]
      const followUpsRes = await supabase.from('leads')
        .select('id, title, follow_up_date, stage, customers(name)')
        .eq('user_id', user.id).is('deleted_at', null)
        .lte('follow_up_date', subWeeks(new Date(), -1).toISOString().split('T')[0])
        .gte('follow_up_date', today)
        .not('stage', 'in', '("Won","Lost")')
        .order('follow_up_date', { ascending: true })
        .limit(5)

      const overdueRes = await supabase.from('projects')
        .select('id, title, contract_value, amount_paid, payment_status, customer_id, customers(name)')
        .eq('user_id', user.id).is('deleted_at', null)
        .in('payment_status', ['Unpaid', 'Partial', 'Overdue'])
        .lt('end_date', today)
        .limit(5)

      return {
        revenue, totalExpenses, profit, margin,
        wonLeads, totalLeads, conversionRate, activeProjects,
        adSpend, avgLeadCost, revenuePerLead, revenuePerWon,
        barChartData, sourceData, expCatData,
        activities, followUps: followUpsRes.data ?? [], overdue: overdueRes.data ?? [],
      }
    },
    staleTime: 60_000,
  })

  const COLORS = ['#e6ab35', '#3583b3', '#10b981', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316']

  const kpiRows = [
    [
      { label: 'Total Revenue', value: formatCurrency(data?.revenue), icon: DollarSign, color: 'text-[#e6ab35]', href: '/reports' },
      { label: 'Total Expenses', value: formatCurrency(data?.totalExpenses), icon: TrendingUp, color: 'text-[#ef4444]', href: '/expenses' },
      { label: 'Gross Profit', value: formatCurrency(data?.profit), icon: DollarSign, color: 'text-[#3583b3]', href: '/reports' },
      { label: 'Profit Margin', value: `${data?.margin ?? 0}%`, icon: TrendingUp, color: 'text-[#e6ab35]', href: '/reports' },
    ],
    [
      { label: 'Total Leads', value: String(data?.totalLeads ?? 0), icon: Target, color: 'text-[#3583b3]', href: '/leads' },
      { label: 'Leads Won', value: String(data?.wonLeads ?? 0), icon: Target, color: 'text-[#e6ab35]', href: '/leads' },
      { label: 'Conversion Rate', value: `${data?.conversionRate ?? 0}%`, icon: TrendingUp, color: 'text-[#e6ab35]', href: '/leads' },
      { label: 'Active Projects', value: String(data?.activeProjects ?? 0), icon: Briefcase, color: 'text-[#3583b3]', href: '/projects' },
    ],
    [
      { label: 'Ad Spend', value: formatCurrency(data?.adSpend), icon: DollarSign, color: 'text-[#ef4444]', href: '/expenses' },
      { label: 'Avg Lead Cost', value: formatCurrency(data?.avgLeadCost), icon: Target, color: 'text-[#ef4444]', href: '/reports' },
      { label: 'Revenue Per Lead', value: formatCurrency(data?.revenuePerLead), icon: TrendingUp, color: 'text-[#3583b3]', href: '/reports' },
      { label: 'Revenue Per Won Lead', value: formatCurrency(data?.revenuePerWon), icon: TrendingUp, color: 'text-[#e6ab35]', href: '/reports' },
    ],
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#9a9585] text-sm">SkyGlobal Renovations overview</p>
        </div>
        <div className="flex gap-1 bg-[#252419] border border-[#2e2d26] rounded-lg p-1">
          {(['Weekly', 'Monthly', 'Yearly', 'All Time'] as Timeframe[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeframe === t ? 'bg-[#e6ab35] text-[#1d1c17] font-semibold' : 'text-[#9a9585] hover:text-[#efeae2]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPI rows */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        kpiRows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {row.map(({ label, value, icon: Icon, color, href }) => (
              <Link key={label} href={href} className="bg-[#252419] border-l-4 border-l-[#e6ab35] border border-[#2e2d26] rounded-xl p-5 cursor-pointer hover:border-[#e6ab35] transition-colors block">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#9a9585] font-medium">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-xl font-bold text-[#e6ab35]">{value}</p>
              </Link>
            ))}
          </div>
        ))
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.barChartData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2d26" />
              <XAxis dataKey="month" tick={{ fill: '#9a9585', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9a9585', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#252419', border: '1px solid #2e2d26', borderRadius: 8 }}
                formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Bar dataKey="revenue" name="Revenue" fill="#e6ab35" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Lead Sources</h3>
          {data?.sourceData && data.sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: '#9a9585' }}
                >
                  {data.sourceData.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#252419', border: '1px solid #2e2d26', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[#9a9585] text-sm">No lead data yet</div>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Expenses by Category</h3>
          {data?.expCatData && data.expCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.expCatData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {data.expCatData.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#252419', border: '1px solid #2e2d26', borderRadius: 8 }}
                  formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-[#9a9585] text-sm">No expense data yet</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          {isLoading ? <TableSkeleton rows={5} /> : (
            data?.activities && data.activities.length > 0 ? (
              <div className="space-y-3">
                {data.activities.map((a: { id: string; type: string; content: string | null; created_at: string; customer_id: string; project_id: string | null }) => (
                  <Link key={a.id} href={a.customer_id ? `/customers/${a.customer_id}` : '#'} className="flex items-start gap-3 hover:bg-[#2e2d26] p-2 rounded-lg transition-colors cursor-pointer">
                    <div className="w-2 h-2 rounded-full bg-[#e6ab35] mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white font-medium">{a.type}</p>
                      {a.content && <p className="text-xs text-[#9a9585] truncate">{a.content}</p>}
                      <p className="text-xs text-[#9a9585]">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-[#9a9585] text-sm">
                <div className="text-center">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No activity yet</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bottom: Follow-ups + Overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming follow-ups */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-[#e6ab35]" />
            <h3 className="text-sm font-semibold text-white">Upcoming Follow-ups</h3>
          </div>
          {isLoading ? <TableSkeleton rows={3} /> : (
            data?.followUps && data.followUps.length > 0 ? (
              <div className="space-y-2">
                {(data.followUps as unknown as Array<{ id: string; title: string; follow_up_date: string | null; customers: { name: string } | null }>).map((f) => (
                  <Link
                    key={f.id}
                    href="/leads"
                    className="flex items-center justify-between p-3 bg-[#1d1c17] rounded-lg hover:bg-[#2e2d26] transition-colors"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{f.title}</p>
                      <p className="text-xs text-[#9a9585]">{(f.customers as { name: string } | null)?.name}</p>
                    </div>
                    <span className="text-xs text-[#e6ab35]">{formatDate(f.follow_up_date)}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[#9a9585] text-sm text-center py-6">No upcoming follow-ups</p>
            )
          )}
        </div>

        {/* Overdue payments */}
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
            <h3 className="text-sm font-semibold text-white">Overdue Payments</h3>
          </div>
          {isLoading ? <TableSkeleton rows={3} /> : (
            data?.overdue && data.overdue.length > 0 ? (
              <div className="space-y-2">
                {(data.overdue as unknown as Array<{ id: string; title: string; customer_id: string; contract_value: number | null; amount_paid: number; customers: { name: string } | null }>).map((p) => (
                  <Link
                    key={p.id}
                    href={`/customers/${p.customer_id}/projects/${p.id}`}
                    className="flex items-center justify-between p-3 bg-[#1d1c17] rounded-lg hover:bg-[#2e2d26] transition-colors"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{p.title}</p>
                      <p className="text-xs text-[#9a9585]">{(p.customers as { name: string } | null)?.name}</p>
                    </div>
                    <span className="text-xs text-[#ef4444] font-medium">
                      {formatCurrency((p.contract_value ?? 0) - p.amount_paid)} due
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[#9a9585] text-sm text-center py-6">No overdue payments</p>
            )
          )}
        </div>
      </div>
    </div>
  )
}
