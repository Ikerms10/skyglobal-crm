'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, CheckCircle2 } from 'lucide-react'
import confetti from 'canvas-confetti'
import { formatCurrency } from '@/lib/utils'
import { Invoice } from '@/types'

const PAYMENT_METHODS = ['Cash', 'Check', 'Zelle', 'Venmo', 'Credit Card', 'Other']

interface Props {
  invoice: Invoice
  onClose: () => void
  onSaved: () => void
}

export function MarkPaidModal({ invoice, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    paid_at: new Date().toISOString().split('T')[0],
    payment_method: 'Zelle',
    payment_notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleRecord = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: form.paid_at,
          payment_method: form.payment_method,
          payment_notes: form.payment_notes || null,
        })
        .eq('id', invoice.id)

      if (error) throw error

      toast.success('Payment recorded!')

      if (invoice.total > 1000) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#e6ab35', '#4A6741', '#fff'] })
      }

      onSaved()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop-blur" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-content-enter" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 16, width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle2 size={20} style={{ color: 'var(--c-sage)' }} />
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--c-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Record Payment
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Amount summary */}
          <div style={{ background: 'var(--c-nested)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)', fontFamily: "'DM Mono', monospace" }}>{invoice.invoice_number}</div>
              <div style={{ fontSize: 13, color: 'var(--c-text-2)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{invoice.customer?.name}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--c-gold)', fontFamily: "'DM Mono', monospace" }}>
              {formatCurrency(invoice.total)}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Payment Date</label>
            <input
              type="date"
              value={form.paid_at}
              onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Payment Method</label>
            <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={inputStyle}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Notes (optional)</label>
            <input
              value={form.payment_notes}
              onChange={e => setForm(f => ({ ...f, payment_notes: e.target.value }))}
              placeholder="e.g. Zelle confirmation #12345"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--c-border)' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid var(--c-border)', borderRadius: 8, background: 'transparent', color: 'var(--c-text-2)', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
            Cancel
          </button>
          <button
            onClick={handleRecord}
            disabled={saving}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: 'var(--c-sage)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Recording…' : 'Record Payment'}
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
