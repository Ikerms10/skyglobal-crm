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
import { Plus, FileText, Download, Copy, Trash2, Edit2, Loader2, Share2, Eye, CheckCircle2, ExternalLink } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { downloadProposalPDF } from '@/components/proposals/ProposalPDF'
import { format } from 'date-fns'
import { useLanguage } from '@/contexts/LanguageContext'
import { useTenant } from '@/contexts/TenantContext'

const STATUS_COLORS: Record<ProposalStatus, { bg: string; text: string }> = {
  Draft:    { bg: 'var(--c-nested)', text: 'var(--c-text-4)' },
  Sent:     { bg: 'rgba(122,158,126,0.10)', text: 'var(--c-sage-soft)' },
  Accepted: { bg: 'var(--c-sage-bg)', text: 'var(--c-sage)' },
  Invoiced: { bg: 'var(--c-gold-bg)', text: 'var(--c-gold)' },
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
  const { t } = useLanguage()
  const { tenant } = useTenant()

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

  const handleShare = async (proposal: any) => {
    const token = proposal.share_token
    if (!token) { toast.error('No share token available'); return }
    const url = `${window.location.origin}/p/${token}`
    await navigator.clipboard.writeText(url)
    toast.success(t('proposals.linkCopied'))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this proposal?')) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('proposals').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast.success(t('proposals.deleted'))
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
    const { data: items } = await supabase.from('proposal_line_items').select('*').eq('proposal_id', proposal.id)
    if (items?.length) {
      await supabase.from('proposal_line_items').insert(items.map(({ id, created_at, proposal_id, ...rest }: any) => ({ ...rest, proposal_id: newP.id })))
    }
    toast.success(t('proposals.duplicated'))
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
    const businessSlug = (tenant?.business_name ?? 'CRM').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
    const dateStr = format(new Date(), 'MMMd')
    const fileName = `${businessSlug}-${TEMPLATE_LABELS[proposal.template as ProposalTemplate].replace(/\s+/g, '')}-${clientSlug}-${dateStr}.pdf`
    const businessInfo = tenant ? {
      name: tenant.business_name,
      phone: tenant.business_phone,
      email: tenant.business_email,
      website: tenant.business_website,
    } : undefined
    await downloadProposalPDF(proposal.template, data, fileName, businessInfo)
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--sg-text-1)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>{t('proposals.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--sg-text-2)', marginTop: 2 }}>
            {proposals.length} {t('proposals.totalLabel')}
          </p>
        </div>
        <Button onClick={() => setShowSelector(true)}>
          <Plus size={16} /> {t('proposals.new')}
        </Button>
      </div>

      {/* Stats */}
      {proposals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATUSES.map(s => {
            const count = proposals.filter(p => p.status === s).length
            const total = proposals.filter(p => p.status === s).reduce((sum: number, p: any) => sum + (p.total_investment ?? 0), 0)
            const col = STATUS_COLORS[s]
            return (
              <div key={s} style={{ background: 'var(--sg-surface)', border: '1px solid var(--sg-border)', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 12, color: 'var(--sg-text-3)', marginBottom: 4, fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--sg-text-1)', fontFamily: "'DM Mono', monospace" }}>{count}</div>
                {total > 0 && <div style={{ fontSize: 11, color: col.text, fontFamily: "'DM Mono', monospace" }}>{formatCurrency(total)}</div>}
              </div>
            )
          })}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--sg-gold)' }} />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('proposals.noProposals')}
          description={t('proposals.noProposalsDesc')}
          action={{ label: `+ ${t('proposals.new')}`, onClick: () => setShowSelector(true) }}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block" style={{ background: 'var(--sg-surface)', border: '1px solid var(--sg-border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--sg-elevated)', borderBottom: '1px solid var(--sg-border-md)' }}>
                  {[t('customers.colName'), t('invoices.colProject'), t('proposals.colTemplate'), t('invoices.colAmount'), t('form.status'), t('proposals.colEngagement'), t('customers.colAdded'), ''].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'var(--sg-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposals.map((p, idx) => {
                  const col = STATUS_COLORS[p.status as ProposalStatus] ?? STATUS_COLORS.Draft
                  return (
                    <tr key={p.id} style={{ borderBottom: idx < proposals.length - 1 ? '1px solid var(--sg-border)' : 'none' }}
                      className="hover:bg-[var(--sg-elevated)] transition-colors">
                      <td style={{ padding: '12px 16px', color: 'var(--sg-text-1)', fontWeight: 500 }}>
                        {p.client_name || p.customer?.name || <span style={{ color: 'var(--sg-text-3)' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--sg-text-2)', fontSize: 13 }}>
                        {p.project_name || <span style={{ color: 'var(--sg-text-3)' }}>Untitled</span>}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--sg-text-2)', fontSize: 13 }}>
                        {TEMPLATE_LABELS[p.template as ProposalTemplate] ?? p.template}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--sg-text-1)', fontWeight: 500, fontFamily: "'DM Mono', monospace" }}>
                        {p.total_investment != null ? formatCurrency(p.total_investment) : <span style={{ color: 'var(--sg-text-3)' }}>—</span>}
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
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          {STATUSES.map(s => <option key={s} value={s} style={{ background: 'var(--sg-surface)', color: 'var(--sg-text-1)' }}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.signed_at ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-sage)', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                            <CheckCircle2 size={13} />
                            Signed {formatDate(p.signed_at)}
                          </div>
                        ) : p.viewed_count > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-gold)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}>
                            <Eye size={13} />
                            Viewed {p.viewed_count}×
                          </div>
                        ) : p.share_token ? (
                          <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>Shared</span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--c-text-4)', fontFamily: "'DM Mono', monospace" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--sg-text-2)', fontSize: 12, fontFamily: "'DM Mono', monospace" }}>
                        {formatDate(p.created_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Link href={`/proposals/new?template=${p.template}&id=${p.id}`}
                            style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, color: 'var(--sg-text-3)', textDecoration: 'none' }}
                            className="hover:bg-[var(--sg-elevated)] hover:text-[var(--sg-text-1)] transition-colors"
                            title="Edit">
                            <Edit2 size={14} />
                          </Link>
                          <button onClick={() => handleShare(p)}
                            style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--sg-text-3)', cursor: 'pointer' }}
                            className="hover:bg-[var(--sg-elevated)] hover:text-[var(--c-sage)] transition-colors"
                            title="Copy share link">
                            <Share2 size={14} />
                          </button>
                          {p.share_token && (
                            <a href={`/p/${p.share_token}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, color: 'var(--sg-text-3)', textDecoration: 'none' }}
                              className="hover:bg-[var(--sg-elevated)] hover:text-[var(--sg-text-1)] transition-colors"
                              title="View as client">
                              <ExternalLink size={14} />
                            </a>
                          )}
                          <button onClick={() => handleDownload(p)}
                            style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--sg-text-3)', cursor: 'pointer' }}
                            className="hover:bg-[var(--sg-elevated)] hover:text-[var(--sg-gold)] transition-colors"
                            title="Download PDF">
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleDuplicate(p)}
                            style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--sg-text-3)', cursor: 'pointer' }}
                            className="hover:bg-[var(--sg-elevated)] hover:text-[var(--sg-text-1)] transition-colors"
                            title="Duplicate">
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, background: 'none', border: 'none', color: 'var(--sg-text-3)', cursor: 'pointer' }}
                            className="hover:bg-[var(--sg-elevated)] hover:text-[var(--sg-danger)] transition-colors"
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
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {proposals.map(p => {
              const col = STATUS_COLORS[p.status as ProposalStatus] ?? STATUS_COLORS.Draft
              return (
                <div key={p.id} style={{ background: 'var(--sg-surface)', border: '1px solid var(--sg-border)', borderRadius: 14, padding: '14px 16px' }} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontWeight: 600, color: 'var(--sg-text-1)', fontSize: 14 }}>
                      {p.client_name || p.customer?.name || '—'}
                    </span>
                    <span style={{ background: col.bg, color: col.text, borderRadius: 20, fontSize: 11, fontWeight: 700, padding: '3px 10px', fontFamily: "'DM Mono', monospace" }}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize: 12, color: 'var(--sg-text-3)' }}>
                      {p.project_name || 'Untitled'} · {TEMPLATE_LABELS[p.template as ProposalTemplate] ?? p.template}
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: 'var(--c-gold)', fontSize: 14 }}>
                      {p.total_investment != null ? formatCurrency(p.total_investment) : '—'}
                    </span>
                  </div>
                  {p.signed_at ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-sage)', fontSize: 11 }}>
                      <CheckCircle2 size={12} /> Signed {formatDate(p.signed_at)}
                    </div>
                  ) : p.viewed_count > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--c-gold)', fontSize: 11 }}>
                      <Eye size={12} /> Viewed {p.viewed_count}×
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1">
                    <Link href={`/proposals/new?template=${p.template}&id=${p.id}`}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--c-nested)', border: '1px solid var(--c-border)', color: 'var(--sg-text-2)', textDecoration: 'none', fontSize: 12, fontWeight: 600, minHeight: 36 }}>
                      <Edit2 size={13} /> Edit
                    </Link>
                    <button onClick={() => handleShare(p)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(122,158,126,0.10)', border: '1px solid rgba(122,158,126,0.25)', color: 'var(--c-sage)', cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 36 }}>
                      <Share2 size={13} /> Share
                    </button>
                    <button onClick={() => handleDownload(p)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--c-border)', color: 'var(--sg-text-3)', cursor: 'pointer', minHeight: 36 }}>
                      <Download size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px', borderRadius: 8, background: 'none', border: '1px solid transparent', color: 'var(--c-danger)', cursor: 'pointer', minHeight: 36 }}>
                      {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
