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
import { EditCustomerModal } from '@/components/customers/EditCustomerModal'
import { Plus, Users, Phone, Mail, Trash2, Pencil, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { cn } from '@/lib/utils'

type SortField = 'name' | 'type' | 'city' | 'created_at'

export default function CustomersPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showReEngage, setShowReEngage] = useState(false)
  const [textCheckIn, setTextCheckIn] = useState<Customer | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
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

  const { data: lifetimeValues = {} } = useQuery({
    queryKey: ['customer-lifetime-values'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}
      const { data } = await supabase.from('projects')
        .select('customer_id, contract_value')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .not('contract_value', 'is', null)
      const map: Record<string, number> = {}
      for (const p of data ?? []) {
        if (p.customer_id) map[p.customer_id] = (map[p.customer_id] ?? 0) + (p.contract_value ?? 0)
      }
      return map
    },
  })

  const { data: lastJobDates = {} } = useQuery({
    queryKey: ['customer-last-job-dates'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return {}
      const { data } = await supabase.from('projects')
        .select('customer_id, created_at')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      const map: Record<string, string> = {}
      for (const p of data ?? []) {
        if (p.customer_id && !map[p.customer_id]) map[p.customer_id] = p.created_at
      }
      return map
    },
  })

  const reEngageCustomers = customers.filter(c => {
    const last = lastJobDates[c.id]
    if (!last) return false
    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000)
    return days > 180
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
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
      <ChevronUp className={cn('h-3 w-3', sortField === field && sortDir === 'asc' ? 'text-[var(--sg-gold)]' : 'text-[var(--sg-text-2)]')} />
      <ChevronDown className={cn('h-3 w-3 -mt-1', sortField === field && sortDir === 'desc' ? 'text-[var(--sg-gold)]' : 'text-[var(--sg-text-2)]')} />
    </span>
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-[var(--sg-text-2)] text-sm">{customers.length} total customers</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div
        className="flex flex-wrap gap-3 items-center md:static sticky top-0 z-10 md:z-auto md:bg-transparent md:border-0 md:pb-0 md:pt-0"
        style={{
          background: 'var(--c-canvas)',
          borderBottom: '1px solid var(--c-border)',
          padding: '10px 0',
        }}
      >
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="bg-[var(--sg-surface)] border border-[var(--sg-border)] text-[var(--sg-text-1)] placeholder-[var(--sg-text-3)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)] w-64"
        />
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setShowReEngage(false) }}
          className="bg-[var(--sg-surface)] border border-[var(--sg-border)] text-[var(--sg-text-1)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)]"
        >
          <option value="">All Types</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
        </select>
        <button
          onClick={() => { setShowReEngage(v => !v); setFilterType('') }}
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            border: `1px solid ${showReEngage ? 'var(--c-danger)' : 'var(--c-border)'}`,
            background: showReEngage ? 'rgba(185,74,58,0.10)' : 'transparent',
            color: showReEngage ? 'var(--c-danger)' : 'var(--c-text-3)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          ⚠️ Re-engage {reEngageCustomers.length > 0 && `(${reEngageCustomers.length})`}
        </button>
      </div>

      {showReEngage && reEngageCustomers.length > 0 && (
        <div style={{ background: 'rgba(185,74,58,0.06)', border: '1px solid rgba(185,74,58,0.20)', borderRadius: 12, padding: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--c-danger)', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Customers with no work in 6+ months
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reEngageCustomers.map(c => {
              const days = Math.floor((Date.now() - new Date(lastJobDates[c.id]).getTime()) / 86400000)
              const msg = `Hi ${c.name.split(' ')[0]}! It's Iker from SkyGlobal Renovations — hope you're doing great! It's been a while and I wanted to reach out. If you have any painting or renovation needs coming up, I'd love to help again. Give me a call anytime! 352-782-2460 🎨`
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '10px 14px' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14 }}>{c.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--c-danger)', fontFamily: "'DM Mono', monospace" }}>{days}d inactive</span>
                  </div>
                  {c.phone && (
                    <a
                      href={`sms:${c.phone}?body=${encodeURIComponent(msg)}`}
                      style={{ fontSize: 12, color: 'var(--c-sage)', background: 'rgba(122,158,126,0.10)', border: '1px solid rgba(122,158,126,0.25)', borderRadius: 6, padding: '5px 12px', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Mono', monospace', whiteSpace: 'nowrap'" }}
                    >
                      📱 Send Check-In
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isLoading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start tracking projects and leads."
          action={{ label: 'Add Customer', onClick: () => setAddOpen(true) }}
        />
      ) : (
        <>
          <div className="hidden sm:block bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--sg-elevated)] border-b border-[var(--sg-border-md)]">
                    {[
                      { label: 'Name', field: 'name' as SortField },
                      { label: 'Type', field: 'type' as SortField },
                      { label: 'Phone', field: null },
                      { label: 'Email', field: null },
                      { label: 'City', field: 'city' as SortField },
                      { label: 'Tags', field: null },
                      { label: 'Lifetime Value', field: null },
                      { label: 'Added', field: 'created_at' as SortField },
                      { label: '', field: null },
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
                  {filtered.map((customer, i) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="data-table border-b border-[var(--sg-border)] transition-colors group cursor-pointer bg-[var(--sg-surface)] hover:bg-[var(--sg-elevated)]"
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--sg-text-1)]">{customer.name}</span>
                        {customer.company_name && <p className="text-xs text-[var(--sg-text-2)]">{customer.company_name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={customer.type === 'Commercial' ? 'purple' : 'info'}>{customer.type}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {customer.phone ? (
                          <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-sm text-[var(--sg-text-1)] hover:text-[var(--sg-sky)] transition-colors">
                            <Phone className="h-3 w-3" />{customer.phone}
                          </a>
                        ) : <span className="text-[var(--sg-text-2)]">—</span>}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {customer.email ? (
                          <a href={`mailto:${customer.email}`} className="flex items-center gap-1 text-sm text-[var(--sg-text-1)] hover:text-[var(--sg-sky)] transition-colors">
                            <Mail className="h-3 w-3" /><span className="truncate max-w-[180px]">{customer.email}</span>
                          </a>
                        ) : <span className="text-[var(--sg-text-2)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)]">{customer.city ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {customer.tags?.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-[var(--sg-elevated)] text-[var(--sg-text-2)] rounded">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lifetimeValues[customer.id] ? (
                          <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 13, color: 'var(--c-gold)' }}>
                            {formatCurrency(lifetimeValues[customer.id])}
                          </span>
                        ) : <span className="text-[var(--sg-text-2)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--sg-text-2)] whitespace-nowrap">{formatDate(customer.created_at)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={e => { e.stopPropagation(); setEditCustomer(customer) }}
                            className="p-1.5 text-[var(--sg-text-2)] hover:text-[var(--sg-sky)] transition-colors rounded"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteId(customer.id) }}
                            className="p-1.5 text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-colors rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sm:hidden flex flex-col gap-3">
            {filtered.map(customer => (
              <div
                key={customer.id}
                onClick={() => router.push(`/customers/${customer.id}`)}
                className="bg-[var(--sg-surface)] border border-[var(--sg-border)] rounded-xl p-4 flex items-center gap-3 cursor-pointer active:opacity-80 min-h-[44px]"
              >
                <div
                  className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, var(--sg-gold), var(--c-gold-dark, var(--sg-gold)))',
                  }}
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[var(--sg-text-1)] truncate">{customer.name}</span>
                    <Badge variant={customer.type === 'Commercial' ? 'purple' : 'info'}>{customer.type}</Badge>
                  </div>
                  <p className="text-xs text-[var(--sg-text-2)] truncate mt-0.5">
                    {customer.phone ?? customer.email ?? customer.city ?? '—'}
                  </p>
                </div>

                {lifetimeValues[customer.id] ? (
                  <span
                    className="flex-shrink-0"
                    style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 13, color: 'var(--sg-gold)' }}
                  >
                    {formatCurrency(lifetimeValues[customer.id])}
                  </span>
                ) : null}

                <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => { e.stopPropagation(); setEditCustomer(customer) }}
                    className="flex items-center justify-center text-[var(--sg-text-2)] hover:text-[var(--sg-sky)] transition-colors rounded"
                    style={{ width: 36, height: 36 }}
                    aria-label={`Edit ${customer.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(customer.id) }}
                    className="flex items-center justify-center text-[var(--sg-text-2)] hover:text-[var(--sg-danger)] transition-colors rounded"
                    style={{ width: 36, height: 36 }}
                    aria-label={`Delete ${customer.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <AddCustomerDrawer open={addOpen} onClose={() => setAddOpen(false)} />
      <EditCustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} />
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
