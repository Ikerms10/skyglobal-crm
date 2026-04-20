'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, X, Check } from 'lucide-react'
import dynamic from 'next/dynamic'

const DownloadWorkOrderButton = dynamic(
  () => import('@/components/pdf/WorkOrderPDF').then(m => m.DownloadWorkOrderButton),
  { ssr: false, loading: () => <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading…</span> }
)

const TRADES = ['Painting', 'Drywall', 'Carpentry', 'Electrical', 'Plumbing', 'Flooring', 'Roofing', 'General', 'Other']
const STATUSES = ['Draft', 'Sent', 'Accepted', 'In Progress', 'Completed', 'Cancelled'] as const
type WOStatus = typeof STATUSES[number]

const STATUS_COLORS: Record<WOStatus, { bg: string; color: string }> = {
  Draft:       { bg: 'var(--c-nested)',           color: 'var(--c-text-4)' },
  Sent:        { bg: 'rgba(122,158,126,0.10)',    color: 'var(--c-sage-soft)' },
  Accepted:    { bg: 'rgba(160,120,80,0.12)',     color: '#A07850' },
  'In Progress': { bg: 'var(--c-gold-bg)',        color: 'var(--c-gold)' },
  Completed:   { bg: 'var(--c-sage-bg)',          color: 'var(--c-sage)' },
  Cancelled:   { bg: 'var(--c-danger-bg)',        color: 'var(--c-danger)' },
}

interface WorkOrder {
  id: string
  title: string
  trade: string
  status: WOStatus
  subcontractor_name: string | null
  subcontractor_phone: string | null
  subcontractor_email: string | null
  scope_of_work: string | null
  budget: number
  actual_cost: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
}

interface WorkOrderItem {
  id: string
  work_order_id: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number | null
  total: number | null
}

interface Props {
  projectId: string
  projectTitle: string
  projectAddress?: string | null
  userId: string
  workOrders: WorkOrder[]
  onRefresh: () => void
}

const BLANK_WO = {
  title: '', trade: 'General', subcontractor_name: '', subcontractor_phone: '',
  subcontractor_email: '', scope_of_work: '', budget: '', start_date: '', end_date: '', notes: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

function StatusBadge({ status }: { status: WOStatus }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.Draft
  return (
    <span style={{ ...c, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  )
}

async function syncWorkOrderExpense(workOrder: WorkOrder & { project_id: string }, userId: string) {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('project_expenses')
    .select('id')
    .eq('project_id', workOrder.project_id)
    .eq('description', `Work Order: ${workOrder.title}`)
    .maybeSingle()

  const expenseData = {
    project_id: workOrder.project_id,
    user_id: userId,
    category: 'Subcontractors',
    description: `Work Order: ${workOrder.title}`,
    amount: workOrder.actual_cost ?? workOrder.budget,
    date: workOrder.end_date ?? new Date().toISOString().split('T')[0],
  }

  if (existing) {
    await supabase.from('project_expenses').update(expenseData).eq('id', existing.id)
  } else {
    await supabase.from('project_expenses').insert(expenseData)
  }
}

export function WorkOrdersTab({ projectId, projectTitle, projectAddress, userId, workOrders, onRefresh }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null)
  const [woItems, setWOItems] = useState<WorkOrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [form, setForm] = useState(BLANK_WO)
  const [creating, setCreating] = useState(false)
  const [actualCostInput, setActualCostInput] = useState('')
  const [savingActual, setSavingActual] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Line item form
  const [liDesc, setLiDesc] = useState('')
  const [liQty, setLiQty] = useState('')
  const [liUnit, setLiUnit] = useState('')
  const [liPrice, setLiPrice] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  const totalBudget = workOrders.reduce((s, w) => s + (w.budget ?? 0), 0)
  const totalActual = workOrders.reduce((s, w) => s + (w.actual_cost ?? 0), 0)

  const openWO = async (wo: WorkOrder) => {
    setSelectedWO(wo)
    setActualCostInput(String(wo.actual_cost ?? ''))
    setLoadingItems(true)
    const supabase = createClient()
    const { data } = await supabase.from('work_order_items').select('*').eq('work_order_id', wo.id).order('created_at')
    setWOItems(data ?? [])
    setLoadingItems(false)
  }

  const createWorkOrder = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.budget || isNaN(parseFloat(form.budget))) { toast.error('Budget required'); return }
    setCreating(true)
    try {
      const supabase = createClient()
      const { data: wo, error } = await supabase.from('work_orders').insert({
        project_id: projectId,
        user_id: userId,
        title: form.title,
        trade: form.trade,
        subcontractor_name: form.subcontractor_name || null,
        subcontractor_phone: form.subcontractor_phone || null,
        subcontractor_email: form.subcontractor_email || null,
        scope_of_work: form.scope_of_work || null,
        budget: parseFloat(form.budget),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        notes: form.notes || null,
        status: 'Draft',
        actual_cost: 0,
      }).select().single()
      if (error) throw new Error(error.message)

      // Auto-create expense
      await syncWorkOrderExpense({ ...wo, project_id: projectId }, userId)

      toast.success('Work order created')
      setShowCreate(false)
      setForm(BLANK_WO)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create work order')
    } finally {
      setCreating(false)
    }
  }

  const updateStatus = async (woId: string, status: WOStatus) => {
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      const { data: updated, error } = await supabase.from('work_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', woId).select().single()
      if (error) throw new Error(error.message)
      if (status === 'Completed') {
        await syncWorkOrderExpense({ ...updated, project_id: projectId }, userId)
        toast.success(`Work order completed! ${formatCurrency(updated.actual_cost || updated.budget)} logged as project expense`)
      } else {
        toast.success(`Status updated to ${status}`)
      }
      setSelectedWO(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const saveActualCost = async () => {
    if (!selectedWO) return
    const val = parseFloat(actualCostInput)
    if (isNaN(val)) { toast.error('Enter a valid amount'); return }
    setSavingActual(true)
    try {
      const supabase = createClient()
      const { data: updated, error } = await supabase.from('work_orders')
        .update({ actual_cost: val, updated_at: new Date().toISOString() })
        .eq('id', selectedWO.id).select().single()
      if (error) throw new Error(error.message)
      await syncWorkOrderExpense({ ...updated, project_id: projectId }, userId)
      toast.success('Actual cost updated and synced to project expenses')
      setSelectedWO(updated)
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSavingActual(false)
    }
  }

  const addItem = async () => {
    if (!liDesc.trim() || !selectedWO) return
    setAddingItem(true)
    try {
      const qty = liQty ? parseFloat(liQty) : null
      const price = liPrice ? parseFloat(liPrice) : null
      const total = qty != null && price != null ? qty * price : null
      const supabase = createClient()
      const { data, error } = await supabase.from('work_order_items').insert({
        work_order_id: selectedWO.id,
        description: liDesc, quantity: qty, unit: liUnit || null,
        unit_price: price, total,
      }).select().single()
      if (error) throw new Error(error.message)
      setWOItems(prev => [...prev, data])
      setLiDesc(''); setLiQty(''); setLiUnit(''); setLiPrice('')
      toast.success('Line item added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const deleteItem = async (id: string) => {
    const supabase = createClient()
    await supabase.from('work_order_items').delete().eq('id', id)
    setWOItems(prev => prev.filter(i => i.id !== id))
  }

  const deleteWO = async (woId: string) => {
    const supabase = createClient()
    await supabase.from('work_orders').delete().eq('id', woId)
    toast.success('Work order deleted')
    setSelectedWO(null)
    onRefresh()
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)', border: '1px solid var(--border-card)',
    borderRadius: 12, padding: 16,
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Work Orders</h3>
          {workOrders.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
              Budget: {formatCurrency(totalBudget)} · Actual: {formatCurrency(totalActual)}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: 'var(--sg-gold)', color: '#000', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> New Work Order
        </button>
      </div>

      {/* List */}
      {workOrders.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>No work orders yet. Create one to scope subcontractor work.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workOrders.map(wo => (
            <div key={wo.id} style={{ ...card, cursor: 'pointer' }} onClick={() => openWO(wo)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={wo.status} />
                  <span style={{ fontSize: 11, background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', padding: '2px 8px', borderRadius: 20 }}>
                    {wo.trade}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <DownloadWorkOrderButton wo={{
                    ...wo, project: { title: projectTitle, address: projectAddress },
                    items: [],
                  }} />
                  <button
                    onClick={() => deleteWO(wo.id)}
                    style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{wo.title}</p>
              {wo.subcontractor_name && (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 8px' }}>
                  {wo.subcontractor_name}{wo.subcontractor_phone ? ` · ${wo.subcontractor_phone}` : ''}
                </p>
              )}
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Budget: <strong style={{ color: 'var(--gold)' }}>{formatCurrency(wo.budget)}</strong></span>
                {(wo.actual_cost ?? 0) > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Actual: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(wo.actual_cost)}</strong></span>
                )}
                {wo.end_date && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Due: {wo.end_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 560,
            maxHeight: '90vh', overflow: 'auto', border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-xl)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>New Work Order</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>TITLE *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Drywall repair - master bedroom" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>TRADE</label>
                  <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>BUDGET * ($)</label>
                  <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} type="number" placeholder="0.00" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>SUBCONTRACTOR NAME</label>
                <input value={form.subcontractor_name} onChange={e => setForm(f => ({ ...f, subcontractor_name: e.target.value }))} placeholder="Contractor name" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>PHONE</label>
                  <input value={form.subcontractor_phone} onChange={e => setForm(f => ({ ...f, subcontractor_phone: e.target.value }))} placeholder="(407) 000-0000" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>EMAIL</label>
                  <input value={form.subcontractor_email} onChange={e => setForm(f => ({ ...f, subcontractor_email: e.target.value }))} placeholder="email@example.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>START DATE</label>
                  <input value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} type="date" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>END DATE</label>
                  <input value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} type="date" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>SCOPE OF WORK *</label>
                <textarea value={form.scope_of_work} onChange={e => setForm(f => ({ ...f, scope_of_work: e.target.value }))} placeholder="Describe the work to be performed..." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>INTERNAL NOTES</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes for your records..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--border-card)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createWorkOrder} disabled={creating} style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--sg-gold)', color: '#000', fontSize: 13, fontWeight: 600, cursor: creating ? 'wait' : 'pointer' }}>
                {creating ? 'Creating…' : 'Create Work Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedWO && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedWO(null)} />
          <div style={{
            width: 520, height: '100%', background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-card)', overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{selectedWO.title}</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <StatusBadge status={selectedWO.status} />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 20 }}>{selectedWO.trade}</span>
                </div>
              </div>
              <button onClick={() => setSelectedWO(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Status */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Update Status</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map(st => (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => updateStatus(selectedWO.id, st)}
                      style={{
                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        border: 'none', cursor: 'pointer',
                        background: selectedWO.status === st ? STATUS_COLORS[st].bg : 'var(--bg-elevated)',
                        color: selectedWO.status === st ? STATUS_COLORS[st].color : 'var(--text-tertiary)',
                        outline: selectedWO.status === st ? `1px solid ${STATUS_COLORS[st].color}` : 'none',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Budget', value: formatCurrency(selectedWO.budget) },
                  { label: 'Subcontractor', value: selectedWO.subcontractor_name ?? '—' },
                  { label: 'Phone', value: selectedWO.subcontractor_phone ?? '—' },
                  { label: 'Email', value: selectedWO.subcontractor_email ?? '—' },
                  { label: 'Start Date', value: selectedWO.start_date ?? '—' },
                  { label: 'End Date', value: selectedWO.end_date ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{label}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Actual cost */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Actual Cost</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={actualCostInput}
                    onChange={e => setActualCostInput(e.target.value)}
                    type="number"
                    placeholder="0.00"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={saveActualCost} disabled={savingActual} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--sg-gold)', color: '#000', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {savingActual ? '…' : 'Save'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Saving syncs this cost to project expenses automatically.</p>
              </div>

              {/* Scope of work */}
              {selectedWO.scope_of_work && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scope of Work</p>
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedWO.scope_of_work}
                  </div>
                </div>
              )}

              {/* Line items */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Line Items</p>
                {loadingItems ? (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading…</p>
                ) : woItems.length > 0 ? (
                  <div style={{ marginBottom: 12 }}>
                    {woItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ flex: 2 }}>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{item.description}</p>
                          {(item.quantity || item.unit) && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{item.quantity} {item.unit}</p>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>{item.total != null ? formatCurrency(item.total) : '—'}</span>
                        <button onClick={() => deleteItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                        Total: {formatCurrency(woItems.reduce((s, i) => s + (i.total ?? 0), 0))}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>No line items yet.</p>
                )}

                {/* Add line item */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.6fr 0.8fr auto', gap: 6, alignItems: 'center' }}>
                  <input value={liDesc} onChange={e => setLiDesc(e.target.value)} placeholder="Description" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={liQty} onChange={e => setLiQty(e.target.value)} type="number" placeholder="Qty" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={liUnit} onChange={e => setLiUnit(e.target.value)} placeholder="Unit" style={{ ...inputStyle, fontSize: 12 }} />
                  <input value={liPrice} onChange={e => setLiPrice(e.target.value)} type="number" placeholder="Price" style={{ ...inputStyle, fontSize: 12 }} />
                  <button onClick={addItem} disabled={addingItem || !liDesc.trim()} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'var(--sg-gold)', color: '#000', cursor: 'pointer' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Download PDF */}
              <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10 }}>
                <DownloadWorkOrderButton wo={{
                  ...selectedWO, project: { title: projectTitle, address: projectAddress },
                  items: woItems,
                }} />
                {selectedWO.status !== 'Completed' && (
                  <button
                    onClick={() => updateStatus(selectedWO.id, 'Completed')}
                    disabled={updatingStatus}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 8, border: 'none', background: 'rgba(74,103,65,0.15)', color: '#4A6741', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Check size={13} /> Mark Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
