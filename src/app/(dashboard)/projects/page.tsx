'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { StatusBadge, PaymentBadge, Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Briefcase } from 'lucide-react'
import Link from 'next/link'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortField = 'title' | 'status' | 'start_date' | 'end_date' | 'contract_value' | 'payment_status'
type ProjectWithCustomer = Project & { customers: { name: string; id: string } | null }

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [sortField, setSortField] = useState<SortField>('start_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const debouncedSearch = useDebounce(search, 300)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase.from('projects')
        .select('*, customers(id, name)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data ?? []) as ProjectWithCustomer[]
    },
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = projects
    .filter(p => {
      const matchSearch = !debouncedSearch ||
        p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.customers?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchStatus = !filterStatus || p.status === filterStatus
      const matchPayment = !filterPayment || p.payment_status === filterPayment
      return matchSearch && matchStatus && matchPayment
    })
    .sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const activeCount = projects.filter(p => ['Scheduled', 'In Progress'].includes(p.status)).length
  const totalContractValue = projects.reduce((sum, p) => sum + (p.contract_value ?? 0), 0)
  const overdueCount = projects.filter(p =>
    ['Unpaid', 'Partial', 'Overdue'].includes(p.payment_status) &&
    p.end_date && p.end_date < new Date().toISOString().split('T')[0]
  ).length

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp className={cn('h-3 w-3', sortField === field && sortDir === 'asc' ? 'text-sky-400' : 'text-slate-600')} />
      <ChevronDown className={cn('h-3 w-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-sky-400' : 'text-slate-600')} />
    </span>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Projects</h1>
        <p className="text-slate-400 text-sm">{projects.length} total projects</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">Active</p>
          <p className="text-2xl font-bold text-sky-400">{activeCount}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Contract Value</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalContractValue)}</p>
        </div>
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4">
          <p className="text-xs text-slate-400">Overdue Payments</p>
          <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="bg-[#1a1d27] border border-[#2a2d3a] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-64"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">All Statuses</option>
          {['Scheduled','In Progress','On Hold','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="">All Payment Status</option>
          {['Unpaid','Partial','Paid','Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No projects found" description="Projects are created when a lead is marked as Won." />
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2d3a]">
                  {[
                    { label: 'Project', field: 'title' as SortField },
                    { label: 'Customer', field: null },
                    { label: 'Status', field: 'status' as SortField },
                    { label: 'Type', field: null },
                    { label: 'Start', field: 'start_date' as SortField },
                    { label: 'End', field: 'end_date' as SortField },
                    { label: 'Contract', field: 'contract_value' as SortField },
                    { label: 'Payment', field: 'payment_status' as SortField },
                  ].map(({ label, field }) => (
                    <th key={label}
                      onClick={field ? () => handleSort(field) : undefined}
                      className={cn('text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap', field && 'cursor-pointer hover:text-white select-none')}
                    >
                      {label}{field && <SortIcon field={field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-[#2a2d3a] hover:bg-[#0f1117] transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${p.customer_id}/projects/${p.id}`}
                        className="text-sm font-medium text-white hover:text-sky-400 transition-colors">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {p.customers && (
                        <Link href={`/customers/${p.customers.id}`} className="text-sm text-slate-400 hover:text-sky-400">
                          {p.customers.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3"><Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>{p.type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{formatDate(p.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{formatDate(p.end_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-400">{formatCurrency(p.contract_value)}</td>
                    <td className="px-4 py-3"><PaymentBadge status={p.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
