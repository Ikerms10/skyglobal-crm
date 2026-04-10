'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, exportToCSV } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#e6ab35', '#3583b3', '#ef4444', '#9a9585', '#e6ab35', '#3583b3', '#ef4444', '#9a9585']

export default function ReportsPage() {
  const [months, setMonths] = useState(6)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', months],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const [projectsRes, leadsRes, expensesRes, projExpRes] = await Promise.all([
        supabase.from('projects').select('id, contract_value, amount_paid, type, customer_id, created_at, customers(name, id)').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('leads').select('id, stage, source, estimated_value, customer_id').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('expenses').select('id, amount, category, date').eq('user_id', user.id).is('deleted_at', null),
        supabase.from('project_expenses').select('id, amount, date').eq('user_id', user.id),
      ])

      const projects = projectsRes.data ?? []
      const leads = leadsRes.data ?? []
      const expenses = expensesRes.data ?? []
      const projExp = projExpRes.data ?? []

      // Monthly P&L
      const monthlyPL = Array.from({ length: months }, (_, i) => {
        const d = subMonths(new Date(), months - 1 - i)
        const monthStr = format(d, 'MMM yyyy')
        const start = startOfMonth(d).toISOString()
        const end = endOfMonth(d).toISOString()

        const rev = projects.filter(p => p.created_at >= start && p.created_at <= end).reduce((s, p) => s + (p.contract_value ?? 0), 0)
        const genExp = expenses.filter(e => e.date >= start.split('T')[0] && e.date <= end.split('T')[0]).reduce((s, e) => s + e.amount, 0)
        const projExpAmt = projExp.filter((e: { date: string; amount: number }) => e.date >= start.split('T')[0] && e.date <= end.split('T')[0]).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
        const exp = genExp + projExpAmt
        const profit = rev - exp
        const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0

        return { month: monthStr, revenue: Math.round(rev), expenses: Math.round(exp), profit: Math.round(profit), margin }
      })

      // Lead source performance
      const sources = ['Thumbtack','Referral','Google','Instagram','Door Knock','Facebook','Yelp','Other']
      const sourcePerf = sources.map(source => {
        const sourceLeads = leads.filter(l => l.source === source)
        const wonLeads = sourceLeads.filter(l => l.stage === 'Won')
        const wonProjectIds = wonLeads.map(l => l.customer_id)
        const revenue = projects.filter(p => wonProjectIds.includes(p.customer_id) && p.type).reduce((s, p) => s + (p.contract_value ?? 0), 0)
        return { source, leads: sourceLeads.length, won: wonLeads.length, revenue: Math.round(revenue) }
      }).filter(s => s.leads > 0)

      // Top customers by revenue
      const customerRevMap: Record<string, { name: string; revenue: number; id: string }> = {}
      projects.forEach(p => {
        const cust = (Array.isArray(p.customers) ? p.customers[0] : p.customers) as { name: string; id: string } | null
        if (!cust) return
        if (!customerRevMap[cust.id]) customerRevMap[cust.id] = { name: cust.name, revenue: 0, id: cust.id }
        customerRevMap[cust.id].revenue += (p.contract_value ?? 0)
      })
      const topCustomers = Object.values(customerRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10)

      // Job type breakdown
      const resRevenue = projects.filter(p => p.type === 'Residential').reduce((s, p) => s + (p.contract_value ?? 0), 0)
      const comRevenue = projects.filter(p => p.type === 'Commercial').reduce((s, p) => s + (p.contract_value ?? 0), 0)
      const typeData = [
        { name: 'Residential', value: Math.round(resRevenue) },
        { name: 'Commercial', value: Math.round(comRevenue) },
      ].filter(d => d.value > 0)

      return { monthlyPL, sourcePerf, topCustomers, typeData }
    },
    staleTime: 60_000,
  })

  const handleExportPL = () => {
    if (!data?.monthlyPL) return
    exportToCSV(data.monthlyPL, 'monthly-pl-report')
  }

  const handleExportSources = () => {
    if (!data?.sourcePerf) return
    exportToCSV(data.sourcePerf, 'lead-source-report')
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-[#9a9585] text-sm">Business analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={months} onChange={e => setMonths(Number(e.target.value))}
            className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]">
            {[3, 6, 12].map(m => <option key={m} value={m}>Last {m} months</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6"><TableSkeleton /><TableSkeleton /></div>
      ) : (
        <>
          {/* Revenue vs Expenses Chart */}
          <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#efeae2] mb-4">Revenue vs Expenses (Monthly)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data?.monthlyPL ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e2d26" />
                <XAxis dataKey="month" tick={{ fill: '#9a9585', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9a9585', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#252419', border: '1px solid #2e2d26', borderRadius: 8 }} formatter={(v: unknown) => [`$${Number(v).toLocaleString()}`, '']} />
                <Bar dataKey="revenue" name="Revenue" fill="#e6ab35" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4,4,0,0]} />
                <Bar dataKey="profit" name="Profit" fill="#3583b3" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Type breakdown */}
            <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#efeae2] mb-4">Revenue by Job Type</h3>
              {data?.typeData && data.typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.typeData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, value }) => `${name}: $${(value/1000).toFixed(0)}k`} labelLine={{ stroke: '#9a9585' }}>
                      {data.typeData.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#252419', border: '1px solid #2e2d26', borderRadius: 8 }} formatter={(v: unknown) => [formatCurrency(Number(v)), '']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-[#9a9585] text-sm">No project data</div>
              )}
            </div>

            {/* Top Customers */}
            <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
              <h3 className="text-sm font-semibold text-[#efeae2] mb-4">Top 10 Customers by Revenue</h3>
              <div className="space-y-2">
                {data?.topCustomers && data.topCustomers.length > 0 ? (
                  data.topCustomers.map((c: { id: string; name: string; revenue: number }, i: number) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[#9a9585] w-5">{i + 1}</span>
                        <span className="text-sm text-[#efeae2]">{c.name}</span>
                      </div>
                      <span className="text-sm font-medium text-[#e6ab35]">{formatCurrency(c.revenue)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[#9a9585] text-sm text-center py-8">No data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Lead Source Performance */}
          <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#efeae2]">Lead Source Performance</h3>
              <Button variant="ghost" size="sm" onClick={handleExportSources}><Download className="h-4 w-4" /> CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-b-[#e6ab35]">
                    {['Source', 'Total Leads', 'Won', 'Conversion Rate', 'Revenue'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-medium text-[#efeae2] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.sourcePerf && data.sourcePerf.map((s: { source: string; leads: number; won: number; revenue: number }, i: number) => (
                    <tr key={s.source} className={`border-b border-[#2e2d26] transition-colors ${i % 2 === 0 ? 'bg-[#1d1c17]' : 'bg-[#252419]'} hover:bg-[#2e2d26]`}>
                      <td className="px-4 py-3 text-sm font-medium text-[#efeae2]">{s.source}</td>
                      <td className="px-4 py-3 text-sm text-[#9a9585]">{s.leads}</td>
                      <td className="px-4 py-3 text-sm text-[#e6ab35]">{s.won}</td>
                      <td className="px-4 py-3 text-sm text-[#9a9585]">
                        {s.leads > 0 ? `${Math.round((s.won / s.leads) * 100)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#e6ab35]">{formatCurrency(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly P&L Table */}
          <div className="bg-[#252419] border border-[#2e2d26] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#efeae2]">Monthly P&L</h3>
              <Button variant="ghost" size="sm" onClick={handleExportPL}><Download className="h-4 w-4" /> CSV</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-b-[#e6ab35]">
                    {['Month', 'Revenue', 'Expenses', 'Profit', 'Margin'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-medium text-[#efeae2] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.monthlyPL && data.monthlyPL.map((row: { month: string; revenue: number; expenses: number; profit: number; margin: number }, i: number) => (
                    <tr key={row.month} className={`border-b border-[#2e2d26] transition-colors ${i % 2 === 0 ? 'bg-[#1d1c17]' : 'bg-[#252419]'} hover:bg-[#2e2d26]`}>
                      <td className="px-4 py-3 text-sm text-[#efeae2] font-medium">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-[#e6ab35]">{formatCurrency(row.revenue)}</td>
                      <td className="px-4 py-3 text-sm text-[#ef4444]">{formatCurrency(row.expenses)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${row.profit >= 0 ? 'text-[#3583b3]' : 'text-[#ef4444]'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className={`px-4 py-3 text-sm ${row.margin >= 0 ? 'text-[#e6ab35]' : 'text-[#ef4444]'}`}>
                        {row.margin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
