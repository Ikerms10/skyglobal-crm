'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Invoice } from '@/types'

interface LineItem {
  id: string
  description: string
  quantity: number | null
  unit_price: number | null
}

const PAYMENT_TERMS = ['Due on Receipt', 'Net 15', 'Net 30', 'Net 60']

function genId() { return Math.random().toString(36).slice(2) }

function calcTotal(items: LineItem[]): number {
  return items.reduce((s, i) => {
    if (i.quantity != null && i.unit_price != null) return s + i.quantity * i.unit_price
    return s
  }, 0)
}

async function nextInvoiceNumber(supabase: ReturnType<typeof createClient>): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .like('invoice_number', `INV-${year}-%`)
  const seq = ((count ?? 0) + 1).toString().padStart(3, '0')
  return `INV-${year}-${seq}`
}

interface Props {
  onClose: () => void
  onSaved: () => void
  projectId?: string
  invoice?: Invoice
}

export function InvoiceModal({ onClose, onSaved, projectId, invoice }: Props) {
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [projects, setProjects] = useState<{ id: string; title: string; customer_id: string | null; contract_value: number | null }[]>([])
  const [form, setForm] = useState({
    customer_id: invoice?.customer_id ?? '',
    project_id: projectId ?? invoice?.project_id ?? '',
    invoice_number: invoice?.invoice_number ?? '',
    issue_date: invoice?.issue_date ?? new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date ?? '',
    payment_terms: invoice?.payment_terms ?? 'Net 30',
    notes: invoice?.notes ?? '',
  })
  const [items, setItems] = useState<LineItem[]>([{ id: genId(), description: '', quantity: 1, unit_price: null }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [custRes, projRes] = await Promise.all([
        supabase.from('customers').select('id, name').eq('user_id', user.id).is('deleted_at', null).order('name'),
        supabase.from('projects').select('id, title, customer_id, contract_value').eq('user_id', user.id).is('deleted_at', null).order('title'),
      ])
      setCustomers(custRes.data ?? [])
      setProjects(projRes.data ?? [])

      // Auto-generate invoice number
      if (!invoice) {
        const num = await nextInvoiceNumber(supabase)
        setForm(f => ({ ...f, invoice_number: num }))
      }

      // Pre-fill line items from project if creating from a project
      if (projectId && !invoice) {
        const { data: lineItems } = await supabase
          .from('project_line_items')
          .select('*')
          .eq('project_id', projectId)
        if (lineItems?.length) {
          setItems(lineItems.map(i => ({ id: genId(), description: i.description, quantity: i.quantity, unit_price: i.unit_price })))
        }
      }

      // Load existing line items
      if (invoice) {
        const { data: existingItems } = await supabase
          .from('invoice_line_items')
          .select('*')
          .eq('invoice_id', invoice.id)
          .order('sort_order')
        if (existingItems?.length) {
          setItems(existingItems.map(i => ({ id: i.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price })))
        }
      }
    }
    load()
  }, [invoice, projectId])

  // Auto-set due date based on payment terms
  useEffect(() => {
    if (!form.payment_terms || !form.issue_date) return
    const issue = new Date(form.issue_date)
    let days = 0
    if (form.payment_terms === 'Net 15') days = 15
    else if (form.payment_terms === 'Net 30') days = 30
    else if (form.payment_terms === 'Net 60') days = 60
    if (days > 0) {
      const due = new Date(issue.getTime() + days * 86400000)
      setForm(f => ({ ...f, due_date: due.toISOString().split('T')[0] }))
    }
  }, [form.payment_terms, form.issue_date])

  // Auto-fill customer from project selection
  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    setForm(f => ({ ...f, project_id: projectId, customer_id: project?.customer_id ?? f.customer_id }))
  }

  const addItem = () => setItems(prev => [...prev, { id: genId(), description: '', quantity: 1, unit_price: null }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const total = calcTotal(items)

  const handleSave = async () => {
    if (!form.invoice_number) { toast.error('Invoice number required'); return }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        customer_id: form.customer_id || null,
        project_id: form.project_id || null,
        invoice_number: form.invoice_number,
        issue_date: form.issue_date,
        due_date: form.due_date || null,
        payment_terms: form.payment_terms,
        notes: form.notes || null,
        total,
      }

      let invoiceId = invoice?.id
      if (invoice) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', invoice.id)
        if (error) throw error
        await supabase.from('invoice_line_items').delete().eq('invoice_id', invoice.id)
      } else {
        const { data, error } = await supabase.from('invoices').insert(payload).select('id').single()
        if (error) throw error
        invoiceId = data.id
      }

      if (invoiceId && items.filter(i => i.description).length > 0) {
        await supabase.from('invoice_line_items').insert(
          items.filter(i => i.description).map((i, idx) => ({
            invoice_id: invoiceId,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total: i.quantity != null && i.unit_price != null ? i.quantity * i.unit_price : null,
            sort_order: idx,
          }))
        )
      }

      toast.success(invoice ? 'Invoice updated' : 'Invoice created')
      onSaved()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {/* Invoice # and dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Invoice #</label>
              <input value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input type="date" value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Terms</label>
              <select value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} style={inputStyle}>
                {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Due date, customer, project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Customer</label>
              <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} style={inputStyle}>
                <option value="">— Select —</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Project (optional)</label>
              <select value={form.project_id} onChange={e => handleProjectChange(e.target.value)} style={inputStyle}>
                <option value="">— None —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>Line Items</label>
              <button onClick={addItem} style={{ fontSize: 11, color: 'var(--c-gold)', background: 'none', border: '1px solid var(--c-gold-border)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Mono', monospace" }}>
                <Plus size={11} /> Add Row
              </button>
            </div>
            <div style={{ border: '1px solid var(--c-border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px auto', background: 'var(--c-elevated)', borderBottom: '1px solid var(--c-border)' }}>
                {['Description', 'Qty', 'Unit Price', ''].map(h => (
                  <div key={h} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--c-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>{h}</div>
                ))}
              </div>
              {items.map(item => {
                const rowTotal = item.quantity != null && item.unit_price != null ? item.quantity * item.unit_price : null
                return (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px auto', borderBottom: '1px solid var(--c-border)', alignItems: 'center' }}>
                    <input
                      value={item.description}
                      onChange={e => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Line item description"
                      style={{ ...inputStyle, border: 'none', borderRadius: 0, background: 'transparent' }}
                    />
                    <input
                      type="number"
                      value={item.quantity ?? ''}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value ? parseFloat(e.target.value) : null)}
                      style={{ ...inputStyle, border: 'none', borderRadius: 0, background: 'transparent', textAlign: 'right' }}
                    />
                    <input
                      type="number"
                      value={item.unit_price ?? ''}
                      onChange={e => updateItem(item.id, 'unit_price', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="0.00"
                      style={{ ...inputStyle, border: 'none', borderRadius: 0, background: 'transparent', textAlign: 'right' }}
                    />
                    <div style={{ padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: 'var(--c-text-2)', minWidth: 64, textAlign: 'right' }}>
                        {rowTotal != null ? formatCurrency(rowTotal) : ''}
                      </span>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-4)', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', background: 'var(--c-elevated)', gap: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-2)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Total</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace" }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Payment instructions, terms, etc."
              style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--c-border)', flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'transparent', color: 'var(--c-text-2)', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: 'var(--c-gold)', color: '#1d1c17', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--c-text-3)',
  fontFamily: "'DM Mono', monospace",
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--c-border)',
  borderRadius: 7,
  background: 'var(--c-nested)',
  color: 'var(--c-text-1)',
  fontSize: 13,
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}
