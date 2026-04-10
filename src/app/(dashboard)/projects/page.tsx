'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { StatusBadge, PaymentBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewProjectModal } from '@/components/projects/NewProjectModal'
import { Briefcase, Plus } from 'lucide-react'
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
  const [newProjectOpen, setNewProjectOpen] = useState(false)
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
      <ChevronUp className={cn('h-3 w-3', sortField === field && sortDir === 'asc' ? 'text-[#e6ab35]' : 'text-[#9a9585]')} />
      <ChevronDown className={cn('h-3 w-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-[#e6ab35]' : 'text-[#9a9585]')} />
    </span>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-[#9a9585] text-sm">{projects.length} total projects</p>
        </div>
        <Button onClick={() => setNewProjectOpen(true)}><Plus className="h-4 w-4" /> New Project</Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#252419] border-l-4 border-l-[#e6ab35] border border-[#2e2d26] rounded-xl p-4">
          <p className="text-xs text-[#9a9585]">Active</p>
          <p className="text-2xl font-bold text-[#e6ab35]">{activeCount}</p>
        </div>
        <div className="bg-[#252419] border-l-4 border-l-[#e6ab35] border border-[#2e2d26] rounded-xl p-4">
          <p className="text-xs text-[#9a9585]">Total Contract Value</p>
          <p className="text-2xl font-bold text-[#e6ab35]">{formatCurrency(totalContractValue)}</p>
        </div>
        <div className="bg-[#252419] border-l-4 border-l-[#ef4444] border border-[#2e2d26] rounded-xl p-4">
          <p className="text-xs text-[#9a9585]">Overdue Payments</p>
          <p className="text-2xl font-bold text-[#ef4444]">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3] w-64"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]">
          <option value="">All Statuses</option>
          {['Scheduled','In Progress','On Hold','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="bg-[#252419] border border-[#2e2d26] text-[#efeae2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]">
          <option value="">All Payment Status</option>
          {['Unpaid','Partial','Paid','Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No projects found" description="Projects are created when a lead is marked as Won." />
      ) : (
        <div className="bg-[#252419] border border-[#2e2d26] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-b-[#e6ab35]">
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
                      className={cn('text-left px-4 py-3 text-xs font-medium text-[#efeae2] uppercase tracking-wider whitespace-nowrap', field && 'cursor-pointer hover:text-[#e6ab35] select-none')}
                    >
                      {label}{field && <SortIcon field={field} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className={`border-b border-[#2e2d26] transition-colors ${i % 2 === 0 ? 'bg-[#1d1c17]' : 'bg-[#252419]'} hover:bg-[#2e2d26]`}>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${p.customer_id}/projects/${p.id}`}
                        className="text-sm font-medium text-[#efeae2] hover:text-[#3583b3] transition-colors">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {p.customers && (
                        <Link href={`/customers/${p.customers.id}`} className="text-sm text-[#9a9585] hover:text-[#3583b3]">
                          {p.customers.name}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3"><Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>{p.type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-[#9a9585] whitespace-nowrap">{formatDate(p.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-[#9a9585] whitespace-nowrap">{formatDate(p.end_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-[#e6ab35]">{formatCurrency(p.contract_value)}</td>
                    <td className="px-4 py-3"><PaymentBadge status={p.payment_status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  )
}
