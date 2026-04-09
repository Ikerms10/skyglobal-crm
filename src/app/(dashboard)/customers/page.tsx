'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Customer } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { AddCustomerDrawer } from '@/components/customers/AddCustomerDrawer'
import { Plus, Users, Phone, Mail, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { cn } from '@/lib/utils'

type SortField = 'name' | 'type' | 'city' | 'created_at'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const debouncedSearch = useDebounce(search, 300)
  const queryClient = useQueryClient()

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase.from('customers')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      return (data ?? []) as Customer[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer deleted')
      setDeleteId(null)
    },
    onError: () => toast.error('Failed to delete customer'),
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = customers
    .filter(c => {
      const matchSearch = !debouncedSearch ||
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.phone?.includes(debouncedSearch) ||
        c.city?.toLowerCase().includes(debouncedSearch.toLowerCase())
      const matchType = !filterType || c.type === filterType
      return matchSearch && matchType
    })
    .sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex flex-col">
      <ChevronUp className={cn('h-3 w-3', sortField === field && sortDir === 'asc' ? 'text-sky-400' : 'text-slate-600')} />
      <ChevronDown className={cn('h-3 w-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-sky-400' : 'text-slate-600')} />
    </span>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-slate-400 text-sm">{customers.length} total customers</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="bg-[#1a1d27] border border-[#2a2d3a] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 w-64"
        />
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-[#1a1d27] border border-[#2a2d3a] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Types</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
        </select>
      </div>

      {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start tracking projects and leads."
          action={{ label: 'Add Customer', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2d3a]">
                  {[
                    { label: 'Name', field: 'name' as SortField },
                    { label: 'Type', field: 'type' as SortField },
                    { label: 'Phone', field: null },
                    { label: 'Email', field: null },
                    { label: 'City', field: 'city' as SortField },
                    { label: 'Tags', field: null },
                    { label: 'Added', field: 'created_at' as SortField },
                    { label: '', field: null },
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
                {filtered.map(customer => (
                  <tr key={customer.id} className="border-b border-[#2a2d3a] hover:bg-[#0f1117] transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${customer.id}`} className="text-sm font-medium text-white hover:text-sky-400 transition-colors">
                        {customer.name}
                      </Link>
                      {customer.company_name && <p className="text-xs text-slate-400">{customer.company_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={customer.type === 'Commercial' ? 'purple' : 'info'}>{customer.type}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm text-slate-300 hover:text-sky-400 transition-colors">
                          <Phone className="h-3 w-3" />{customer.phone}
                        </a>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-sm text-slate-300 hover:text-sky-400 transition-colors">
                          <Mail className="h-3 w-3" /><span className="truncate max-w-[180px]">{customer.email}</span>
                        </a>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{customer.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 bg-[#2a2d3a] text-slate-300 rounded">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{formatDate(customer.created_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteId(customer.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCustomerDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Delete Customer"
        description="This will also delete all their leads and projects. This cannot be undone."
      />
    </div>
  )
}
