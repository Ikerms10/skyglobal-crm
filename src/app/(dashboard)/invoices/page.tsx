'use client'
import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, FileText, Loader2, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Invoice, InvoiceStatus } from '@/types'
import Link from 'next/link'
import { differenceInDays, parseISO } from 'date-fns'
import { InvoiceModal } from '@/components/invoices/InvoiceModal'
import { MarkPaidModal } from '@/components/invoices/MarkPaidModal'
import { downloadInvoicePDF } from '@/components/invoices/InvoicePDF'

const STATUS_STYLE: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
  draft:   { bg: 'var(--c-nested)',              text: 'var(--c-text-3)',    label: 'Draft' },
  sent:    { bg: 'rgba(122,158,126,0.10)',        text: 'var(--c-sage-soft)', label: 'Sent' },
  paid:    { bg: 'var(--c-sage-bg)',              text: 'var(--c-sage)',      label: 'Paid' },
  overdue: { bg: 'rgba(185,74,58,0.12)',          text: 'var(--c-danger)',    label: 'Overdue' },
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
]

export default function InvoicesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null)

  // Keyboard shortcut: N → new invoice
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        setCreateOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []
      const { data } = await supabase
        .from('invoices')
        .select('*, project:projects(id, title), customer:customers(id, name)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      return (data ?? []) as Invoice[]
    },
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    const supabase = createClient()
    await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast.success('Invoice deleted')
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = invoices.filter(inv => {
    if (filter === 'all') return true
    if (filter === 'overdue') return inv.status === 'sent' && inv.due_date && inv.due_date < today
    return inv.status === filter
  })

  const outstanding = invoices
    .filter(i => i.status === 'sent')
    .reduce((s, i) => s + i.total, 0)

  const overdue = invoices
    .filter(i => i.status === 'sent' && i.due_date && i.due_date < today)
    .reduce((s, i) => s + i.total, 0)

  const paidThisMonth = (() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return invoices
      .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= monthStart)
      .reduce((s, i) => s + i.total, 0)
  })()

  return (
    <div className="p-4 md:p-6 space-y-6">
      {createOpen && (
        <InvoiceModal
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
          }}
        />
      )}
      {markPaidInvoice && (
        <MarkPaidModal
          invoice={markPaidInvoice}
          onClose={() => setMarkPaidInvoice(null)}
          onSaved={() => {
            setMarkPaidInvoice(null)
            queryClient.invalidateQueries({ queryKey: ['invoices'] })
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em', margin: 0 }}>
            Invoices
          </h1>
          <p style={{ fontSize: 13, color: 'var(--c-text-3)', marginTop: 2, fontFamily: "'DM Mono', monospace" }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New Invoice
        </Button>
      </div>

      {/* Totals bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Outstanding', value: outstanding, icon: DollarSign, color: 'var(--c-gold)' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: overdue > 0 ? 'var(--c-danger)' : 'var(--c-text-3)' },
          { label: 'Paid This Month', value: paidThisMonth, icon: CheckCircle2, color: 'var(--c-sage)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--c-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'DM Mono', monospace", marginTop: 1 }} className={label === 'Outstanding' && value > 0 ? 'value-shimmer' : ''}>{formatCurrency(value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--c-nested)', borderRadius: 10, border: '1px solid var(--c-border)', width: 'fit-content', position: 'relative' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              position: 'relative',
              padding: '5px 14px',
              borderRadius: 7,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: filter === f.value ? 700 : 500,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.06em',
              background: 'transparent',
              color: filter === f.value ? 'var(--c-gold)' : 'var(--c-text-3)',
              transition: 'color 150ms',
              zIndex: 1,
            }}
          >
            {filter === f.value && (
              <motion.div
                layoutId="invoice-tab-bg"
                style={{ position: 'absolute', inset: 0, borderRadius: 7, background: 'var(--c-gold-bg)', zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--c-gold)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices"
            description={filter === 'all' ? 'Create your first invoice to start tracking payments.' : `No ${filter.toLowerCase()} invoices.`}
            action={filter === 'all' ? { label: '+ New Invoice', onClick: () => setCreateOpen(true) } : undefined}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--c-elevated)', borderBottom: '1px solid var(--c-border-mid)' }}>
                {['Invoice #', 'Client', 'Project', 'Amount', 'Due Date', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--c-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, idx) => {
                const isOverdue = inv.status === 'sent' && inv.due_date && inv.due_date < today
                const effectiveStatus: InvoiceStatus = isOverdue ? 'overdue' : inv.status
                const st = STATUS_STYLE[effectiveStatus]
                const daysOverdue = isOverdue && inv.due_date
                  ? differenceInDays(new Date(), parseISO(inv.due_date))
                  : null

                return (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--c-border)' : 'none', cursor: 'pointer' }}
                    className="hover:bg-[var(--c-elevated)] transition-colors group"
                    onClick={() => inv.status !== 'paid' && setMarkPaidInvoice(inv)}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontWeight: 700, color: 'var(--c-gold)', fontSize: 13 }}>
                      {inv.invoice_number}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--c-text-1)', fontWeight: 500 }}>
                      {inv.customer?.name ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--c-text-2)', fontSize: 13 }}>
                      {inv.project?.title ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: "'DM Mono', monospace", fontWeight: 600, color: 'var(--c-text-1)' }}>
                      {formatCurrency(inv.total)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--c-text-2)' }}>
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                      {daysOverdue !== null && (
                        <div style={{ fontSize: 10, color: 'var(--c-danger)', fontWeight: 600 }}>{daysOverdue}d overdue</div>
                      )}
                      {inv.status === 'paid' && inv.paid_at && (
                        <div style={{ fontSize: 10, color: 'var(--c-sage)', fontWeight: 600 }}>Paid {formatDate(inv.paid_at)}</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: st.bg, color: st.text, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px', fontFamily: "'DM Mono', monospace" }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => setMarkPaidInvoice(inv)}
                            style={{ fontSize: 11, color: 'var(--c-sage)', background: 'rgba(122,158,126,0.10)', border: '1px solid rgba(122,158,126,0.25)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600, fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap' }}
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => downloadInvoicePDF(inv)}
                          style={{ fontSize: 11, color: 'var(--c-text-3)', background: 'none', border: '1px solid var(--c-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          style={{ fontSize: 11, color: 'var(--c-danger)', background: 'none', border: '1px solid transparent', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontFamily: "'DM Mono', monospace" }}
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
