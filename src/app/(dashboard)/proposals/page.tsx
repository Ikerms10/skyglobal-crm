'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { TemplateSelector } from '@/components/proposals/TemplateSelector'
import { ProposalTemplate, ProposalStatus } from '@/types'
import { Plus, FileText, Download, Copy, Trash2, Edit2, Loader2 } from 'lucide-react'
import { downloadProposalPDF } from '@/components/proposals/ProposalPDF'
import { format } from 'date-fns'

const STATUS_COLORS: Record<ProposalStatus, { bg: string; text: string }> = {
  Draft:    { bg: '#2e2d26', text: '#9a9585' },
  Sent:     { bg: '#1e3a5f', text: '#3583b3' },
  Accepted: { bg: '#14532d', text: '#22c55e' },
  Invoiced: { bg: '#1c1917', text: '#e6ab35' },
}

const TEMPLATE_LABELS: Record<ProposalTemplate, string> = {
  interior: 'Interior Painting',
  exterior: 'Exterior Painting',
  cabinet: 'Cabinet Refinishing',
  custom: 'Custom / Other',
}

const STATUSES: ProposalStatus[] = ['Draft', 'Sent', 'Accepted', 'Invoiced']

export default function ProposalsPage() {
  const router = useRouter()
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSelector, setShowSelector] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('proposals')
      .select('*, customer:customers(name)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (!error) setProposals(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSelect = (template: ProposalTemplate) => {
    setShowSelector(false)
    router.push(`/proposals/new?template=${template}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('proposals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast.success('Proposal deleted')
    setDeletingId(null)
    load()
  }

  const handleDuplicate = async (proposal: any) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newP, error } = await supabase.from('proposals').insert({
      ...proposal,
      id: undefined,
      status: 'Draft',
      project_name: proposal.project_name ? `${proposal.project_name} (Copy)` : null,
      created_at: undefined,
      updated_at: undefined,
      customer: undefined,
    }).select('id').single()
    if (error) { toast.error('Failed to duplicate'); return }
    // Duplicate line items
    const { data: items } = await supabase.from('proposal_line_items').select('*').eq('proposal_id', proposal.id)
    if (items?.length) {
      await supabase.from('proposal_line_items').insert(items.map(({ id, created_at, proposal_id, ...rest }: any) => ({ ...rest, proposal_id: newP.id })))
    }
    toast.success('Proposal duplicated')
    load()
  }

  const handleDownload = async (proposal: any) => {
    const supabase = createClient()
    const { data: items } = await supabase.from('proposal_line_items').select('*').eq('proposal_id', proposal.id).order('sort_order')
    const td = proposal.template_data ?? {}
    const data = {
      projectName: proposal.project_name ?? '',
      issueDate: proposal.issue_date ?? '',
      validUntil: proposal.valid_until ?? '',
      clientName: proposal.client_name ?? '',
      clientContact: proposal.client_contact ?? '',
      clientAddress: proposal.client_address ?? '',
      projectScope: proposal.project_scope ?? '',
      totalInvestment: proposal.total_investment,
      depositPct: proposal.deposit_pct,
      progressPct: proposal.progress_pct,
      finalPct: proposal.final_pct,
      lineItems: (items ?? []).map((i: any) => ({ id: i.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, total: i.total })),
      showInsurancePage: proposal.show_insurance_page,
      coatingTier: td.coatingTier ?? '',
      sheen: td.sheen ?? 'Satin',
      scopeOfWork: td.scopeOfWork ?? '',
    }
    const clientSlug = (proposal.client_name || 'Client').replace(/\s+/g, '')
    const dateStr = format(new Date(), 'MMMd')
    const fileName = `SkyGlobal-${TEMPLATE_LABELS[proposal.template as ProposalTemplate].replace(/\s+/g, '')}-${clientSlug}-${dateStr}.pdf`
    await downloadProposalPDF(proposal.template, data, fileName)
  }

  const handleStatusChange = async (id: string, status: ProposalStatus) => {
    const supabase = createClient()
    await supabase.from('proposals').update({ status }).eq('id', id)
    setProposals(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {showSelector && <TemplateSelector onSelect={handleSelect} onClose={() => setShowSelector(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#efeae2' }}>Proposals</h1>
          <p style={{ fontSize: 14, color: '#9a9585', marginTop: 2 }}>
            {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Button onClick={() => setShowSelector(true)}>
          <Plus size={16} /> Create Proposal
        </Button>
      </div>

      {/* Stats */}
      {proposals.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {STATUSES.map(s => {
            const count = proposals.filter(p => p.status === s).length
            const total = proposals.filter(p => p.status === s).reduce((sum: number, p: any) => sum + (p.total_investment ?? 0), 0)
            const col = STATUS_COLORS[s]
            return (
              <div key={s} style={{ background: '#252419', border: '1px solid #2e2d26', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: '#9a9585', marginBottom: 4 }}>{s}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#efeae2' }}>{count}</div>
                {total > 0 && <div style={{ fontSize: 11, color: col.text }}>${total.toLocaleString()}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#252419', border: '1px solid #2e2d26', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: '#e6ab35' }} />
          </div>
        ) : proposals.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 16 }}>
            <FileText size={40} style={{ color: '#4b5563' }} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#9a9585', marginBottom: 4 }}>No proposals yet</p>
              <p style={{ color: '#4b5563', fontSize: 13 }}>Create your first proposal to get started</p>
            </div>
            <Button onClick={() => setShowSelector(true)}><Plus size={15} /> Create Proposal</Button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2e2d26' }}>
                {['Client', 'Project', 'Template', 'Total', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9a9585', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proposals.map((p, idx) => {
                const col = STATUS_COLORS[p.status as ProposalStatus] ?? STATUS_COLORS.Draft
                return (
                  <tr key={p.id} style={{ borderBottom: idx < proposals.length - 1 ? '1px solid #2e2d26' : 'none' }}
                    className="hover:bg-[#2e2d26] transition-colors">
                    <td style={{ padding: '12px 16px', color: '#efeae2', fontWeight: 500 }}>
                      {p.client_name || p.customer?.name || <span style={{ color: '#4b5563' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9a9585', fontSize: 13 }}>
                      {p.project_name || <span style={{ color: '#4b5563' }}>Untitled</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9a9585', fontSize: 13 }}>
                      {TEMPLATE_LABELS[p.template as ProposalTemplate] ?? p.template}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#efeae2', fontWeight: 500 }}>
                      {p.total_investment != null ? formatCurrency(p.total_investment) : <span style={{ color: '#4b5563' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={p.status}
                        onChange={e => handleStatusChange(p.id, e.target.value as ProposalStatus)}
                        style={{
                          background: col.bg, color: col.text,
                          border: 'none', borderRadius: 20,
                          fontSize: 11, fontWeight: 600, padding: '3px 10px',
                          cursor: 'pointer', outline: 'none',
                        }}
                      >
                        {STATUSES.map(s => <option key={s} value={s} style={{ background: '#252419', color: '#efeae2' }}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#9a9585', fontSize: 12 }}>
                      {formatDate(p.created_at)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Link href={`/proposals/new?template=${p.template}&id=${p.id}`}
                          style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, color: '#9a9585', textDecoration: 'none' }}
                          className="hover:bg-[#3a3930] hover:text-white transition-colors"
                          title="Edit">
                          <Edit2 size={14} />
                        </Link>
                        <button onClick={() => handleDownload(p)}
                          style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#9a9585', cursor: 'pointer' }}
                          className="hover:bg-[#3a3930] hover:text-[#e6ab35] transition-colors"
                          title="Download PDF">
                          <Download size={14} />
                        </button>
                        <button onClick={() => handleDuplicate(p)}
                          style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#9a9585', cursor: 'pointer' }}
                          className="hover:bg-[#3a3930] hover:text-white transition-colors"
                          title="Duplicate">
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#9a9585', cursor: 'pointer' }}
                          className="hover:bg-[#3a3930] hover:text-[#ef4444] transition-colors"
                          title="Delete">
                          {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
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
