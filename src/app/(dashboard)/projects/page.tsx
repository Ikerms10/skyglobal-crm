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
import { DirectionsButton } from '@/components/ui/MapsLink'
import { Briefcase, Plus, List, MapPin, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown } from 'lucide-react'

type SortField = 'title' | 'status' | 'start_date' | 'end_date' | 'contract_value' | 'payment_status'
type ProjectWithCustomer = Project & { customers: { name: string; id: string } | null }

function MapViewCard({ p, onClick }: { p: ProjectWithCustomer; onClick: () => void }) {
  return (
    <div className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4 flex flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--sg-text-1)] leading-tight">{p.title}</p>
          <StatusBadge status={p.status} />
        </div>
        {p.customers && (
          <p className="text-xs text-[var(--sg-text-2)] mt-0.5">{p.customers.name}</p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>{p.type}</Badge>
        </div>
      </div>
      {p.address && (
        <div className="flex items-start gap-1.5 text-xs text-[var(--sg-text-2)]">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-[var(--sg-sky)]" />
          <span className="break-words">{p.address}</span>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap mt-auto pt-1">
        {p.address && <DirectionsButton address={p.address} />}
        <button onClick={onClick}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--sg-base)] border border-[var(--sg-border)] text-[var(--sg-text-1)] hover:bg-[var(--sg-elevated)] transition-colors">
          <ExternalLink className="h-3.5 w-3.5" /> Open Project
        </button>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [sortField, setSortField] = useState<SortField>('start_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
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

  const mapProjects = filtered
    .filter(p => ['Scheduled', 'In Progress', 'On Hold'].includes(p.status))
    .sort((a, b) => {
      const order = { 'In Progress': 0, 'Scheduled': 1, 'On Hold': 2 }
      return (order[a.status as keyof typeof order] ?? 9) - (order[b.status as keyof typeof order] ?? 9)
    })

  const viewAllOnMapUrl = mapProjects
    .filter(p => p.address)
    .slice(0, 5)
    .map(p => encodeURIComponent(p.address!))
    .join('+OR+')

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp className={cn('h-3 w-3', sortField === field && sortDir === 'asc' ? 'text-[var(--sg-gold)]' : 'text-[var(--sg-text-2)]')} />
      <ChevronDown className={cn('h-3 w-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-[var(--sg-gold)]' : 'text-[var(--sg-text-2)]')} />
    </span>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-[var(--sg-text-2)] text-sm">{projects.length} total projects</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode('list')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                viewMode === 'list' ? 'bg-[var(--sg-gold)] text-black' : 'text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]')}>
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button onClick={() => setViewMode('map')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                viewMode === 'map' ? 'bg-[var(--sg-gold)] text-black' : 'text-[var(--sg-text-2)] hover:text-[var(--sg-text-1)]')}>
              <MapPin className="h-3.5 w-3.5" /> Map
            </button>
          </div>
          <Button onClick={() => setNewProjectOpen(true)}><Plus className="h-4 w-4" /> New Project</Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--sg-surface)] border-l-4 border-l-[var(--sg-gold)] border border-[var(--sg-border)] rounded-xl p-4">
          <p className="text-xs text-[var(--sg-text-2)]">Active</p>
          <p className="text-2xl font-bold text-[var(--sg-gold)]">{activeCount}</p>
        </div>
        <div className="bg-[var(--sg-surface)] border-l-4 border-l-[var(--sg-gold)] border border-[var(--sg-border)] rounded-xl p-4">
          <p className="text-xs text-[var(--sg-text-2)]">Contract Value</p>
          <p className="text-2xl font-bold text-[var(--sg-gold)]">{formatCurrency(totalContractValue)}</p>
        </div>
        <div className="bg-[var(--sg-surface)] border-l-4 border-l-[var(--sg-danger)] border border-[var(--sg-border)] rounded-xl p-4">
          <p className="text-xs text-[var(--sg-text-2)]">Overdue</p>
          <p className="text-2xl font-bold text-[var(--sg-danger)]">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="bg-[var(--sg-surface)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-3)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)] w-64"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[var(--sg-surface)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)]">
          <option value="">All Statuses</option>
          {['Scheduled','In Progress','On Hold','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="bg-[var(--sg-surface)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)]">
          <option value="">All Payment Status</option>
          {['Unpaid','Partial','Paid','Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState icon={Briefcase} title="No projects found" description="Projects are created from the New Project button or when a lead is marked Won." />
      ) : viewMode === 'map' ? (
        <div>
          {viewAllOnMapUrl && (
            <div className="mb-4">
              <a
                href={`https://www.google.com/maps/search/${viewAllOnMapUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[var(--sg-sky)] hover:brightness-110 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                🗺️ View All on Map
              </a>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mapProjects.length > 0 ? mapProjects.map(p => (
              <MapViewCard key={p.id} p={p} onClick={() => router.push(`/customers/${p.customer_id}/projects/${p.id}`)} />
            )) : (
              <p className="text-[var(--sg-text-2)] text-sm col-span-2 py-8 text-center">No active projects with addresses</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="hidden sm:block bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 700 }}>
                <thead>
                  <tr className="bg-[var(--sg-elevated)] border-b border-[var(--sg-border-md)]">
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
                        className={cn('text-left px-4 py-3 text-xs font-medium text-[var(--sg-text-3)] uppercase tracking-wider whitespace-nowrap', field && 'cursor-pointer hover:text-[var(--sg-text-1)] select-none')}
                      >
                        {label}{field && <SortIcon field={field} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/customers/${p.customer_id}/projects/${p.id}`)}
                      className="data-table border-b border-[var(--sg-border)] transition-colors cursor-pointer bg-[var(--sg-surface)] hover:bg-[var(--sg-elevated)]"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--sg-text-1)]">{p.title}</span>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {p.customers && (
                          <Link href={`/customers/${p.customers.id}`} className="text-sm text-[var(--sg-text-2)] hover:text-[var(--sg-sky)]">
                            {p.customers.name}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3"><Badge variant={p.type === 'Commercial' ? 'purple' : 'info'}>{p.type}</Badge></td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">{formatDate(p.start_date)}</td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">{formatDate(p.end_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--sg-gold)]">{formatCurrency(p.contract_value)}</td>
                      <td className="px-4 py-3"><PaymentBadge status={p.payment_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sm:hidden flex flex-col gap-3">
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => router.push(`/customers/${p.customer_id}/projects/${p.id}`)}
                className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4 flex flex-col gap-2 cursor-pointer active:opacity-80 min-h-[44px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-[var(--sg-text-1)] leading-tight">{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--sg-text-2)]">{p.customers?.name ?? '—'}</span>
                  <PaymentBadge status={p.payment_status} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 13, color: 'var(--sg-gold)' }}>
                    {formatCurrency(p.contract_value)}
                  </span>
                  <span className="text-xs text-[var(--sg-text-2)]">{formatDate(p.start_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </div>
  )
}
