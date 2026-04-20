'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Save, Eye, EyeOff, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ProposalTemplate } from '@/types'
import { InteriorTemplate } from '@/components/proposals/templates/InteriorTemplate'
import { ExteriorTemplate } from '@/components/proposals/templates/ExteriorTemplate'
import { CabinetTemplate } from '@/components/proposals/templates/CabinetTemplate'
import { CustomTemplate } from '@/components/proposals/templates/CustomTemplate'
import { LineItem } from '@/components/proposals/EditableTable'
import { downloadProposalPDF } from '@/components/proposals/ProposalPDF'
import { format } from 'date-fns'

const TEMPLATE_LABELS: Record<ProposalTemplate, string> = {
  interior: 'Interior Painting',
  exterior: 'Exterior Painting',
  cabinet: 'Cabinet Refinishing',
  custom: 'Custom / Other',
}

function genId() { return Math.random().toString(36).slice(2) }

function defaultLineItems(template: ProposalTemplate): LineItem[] {
  if (template === 'interior') {
    return [
      { id: genId(), description: "Sherwin-Williams Emerald® Interior", quantity: 2, unit_price: 89, total: 178 },
      { id: genId(), description: "ProClassic® Trim Enamel", quantity: 1, unit_price: 72, total: 72 },
      { id: genId(), description: "Prep Materials (Tape, Plastic, Spackle)", quantity: null, unit_price: null, total: null },
    ]
  }
  if (template === 'exterior') {
    return [
      { id: genId(), description: "Sherwin-Williams Premium Exterior Coating", quantity: 3, unit_price: 89, total: 267 },
      { id: genId(), description: "SherMax™ Elastomeric Sealant", quantity: null, unit_price: null, total: null },
      { id: genId(), description: "Prep Materials & Masking", quantity: null, unit_price: null, total: null },
    ]
  }
  return []
}

function buildInitialData(template: ProposalTemplate, customer: any) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const validUntil = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const base = {
    projectName: '',
    issueDate: today,
    validUntil,
    clientName: customer?.name ?? '',
    clientContact: [customer?.phone, customer?.email].filter(Boolean).join(' | '),
    clientAddress: [customer?.address, customer?.city, customer?.state].filter(Boolean).join(', '),
    projectScope: template === 'interior' ? 'Full Interior Repaint' : '',
    totalInvestment: null as number | null,
    depositPct: 30,
    progressPct: 45,
    finalPct: 25,
    lineItems: defaultLineItems(template),
    showInsurancePage: true,
    // template-specific
    coatingTier: template === 'exterior' ? 'tier2' : template === 'cabinet' ? 'signature' : '',
    sheen: 'Satin',
    scopeOfWork: '',
  }
  return base
}

type EditorData = ReturnType<typeof buildInitialData>

export default function ProposalNewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const template = (searchParams.get('template') ?? 'interior') as ProposalTemplate
  const customerId = searchParams.get('customer')
  const proposalId = searchParams.get('id')

  const [customer, setCustomer] = useState<any>(null)
  const [data, setData] = useState<EditorData | null>(null)
  const [proposalDbId, setProposalDbId] = useState<string | null>(proposalId)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [pdfLoading, setPdfLoading] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const isFirstSave = useRef(true)

  // Load customer if provided
  useEffect(() => {
    if (!customerId) {
      setData(buildInitialData(template, null))
      return
    }
    const supabase = createClient()
    supabase.from('customers').select('*').eq('id', customerId).single()
      .then(({ data: cust }) => {
        setCustomer(cust)
        setData(buildInitialData(template, cust))
      })
  }, [customerId, template])

  // Load existing proposal if editing
  useEffect(() => {
    if (!proposalId) return
    const supabase = createClient()
    Promise.all([
      supabase.from('proposals').select('*, customer:customers(*)').eq('id', proposalId).single(),
      supabase.from('proposal_line_items').select('*').eq('proposal_id', proposalId).order('sort_order'),
    ]).then(([{ data: p }, { data: items }]) => {
      if (!p) return
      setCustomer(p.customer)
      setProposalDbId(p.id)
      const td = p.template_data ?? {}
      setData({
        projectName: p.project_name ?? '',
        issueDate: p.issue_date ?? format(new Date(), 'yyyy-MM-dd'),
        validUntil: p.valid_until ?? format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        clientName: p.client_name ?? '',
        clientContact: p.client_contact ?? '',
        clientAddress: p.client_address ?? '',
        projectScope: p.project_scope ?? '',
        totalInvestment: p.total_investment,
        depositPct: p.deposit_pct,
        progressPct: p.progress_pct,
        finalPct: p.final_pct,
        lineItems: (items ?? []).map((i: any) => ({ id: i.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, total: i.total })),
        showInsurancePage: p.show_insurance_page,
        coatingTier: td.coatingTier ?? '',
        sheen: td.sheen ?? 'Satin',
        scopeOfWork: td.scopeOfWork ?? '',
      })
    })
  }, [proposalId])

  const handleChange = useCallback((patch: Partial<EditorData>) => {
    setData(prev => {
      if (!prev) return prev
      return { ...prev, ...patch }
    })
    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving')
      setData(current => {
        if (current) scheduleSave(current)
        return current
      })
    }, 2000)
  }, [])

  const scheduleSave = useCallback(async (d: EditorData) => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const payload = {
        user_id: user.id,
        customer_id: customerId || null,
        template,
        project_name: d.projectName || null,
        client_name: d.clientName || null,
        client_contact: d.clientContact || null,
        client_address: d.clientAddress || null,
        project_scope: d.projectScope || null,
        total_investment: d.totalInvestment,
        issue_date: d.issueDate || null,
        valid_until: d.validUntil || null,
        deposit_pct: d.depositPct,
        progress_pct: d.progressPct,
        final_pct: d.finalPct,
        show_insurance_page: d.showInsurancePage,
        template_data: { coatingTier: d.coatingTier, sheen: d.sheen, scopeOfWork: d.scopeOfWork },
        updated_at: new Date().toISOString(),
      }

      let currentId = proposalDbId
      if (!currentId) {
        const { data: created, error } = await supabase.from('proposals').insert(payload).select('id').single()
        if (error) throw error
        currentId = created.id
        setProposalDbId(currentId)
        // Update URL without reload
        const url = new URL(window.location.href)
        url.searchParams.set('id', currentId!)
        window.history.replaceState({}, '', url.toString())
      } else {
        const { error } = await supabase.from('proposals').update(payload).eq('id', currentId)
        if (error) throw error
      }

      // Upsert line items
      if (currentId) {
        await supabase.from('proposal_line_items').delete().eq('proposal_id', currentId)
        if (d.lineItems.length > 0) {
          await supabase.from('proposal_line_items').insert(
            d.lineItems.map((item, idx) => ({
              proposal_id: currentId,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.total,
              sort_order: idx,
            }))
          )
        }
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err) {
      setSaveStatus('idle')
      toast.error('Auto-save failed')
    }
  }, [customerId, template, proposalDbId])

  const handleSaveNow = async () => {
    if (!data) return
    setSaveStatus('saving')
    await scheduleSave(data)
  }

  const handleDownloadPDF = async () => {
    if (!data) return
    setPdfLoading(true)
    try {
      const clientSlug = (data.clientName || 'Client').replace(/\s+/g, '')
      const dateStr = format(new Date(), 'MMMd')
      const fileName = `SkyGlobal-${TEMPLATE_LABELS[template].replace(/\s+/g, '')}-${clientSlug}-${dateStr}.pdf`
      await downloadProposalPDF(template, data, fileName)
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error('PDF generation failed')
    } finally {
      setPdfLoading(false)
    }
  }

  const renderTemplate = () => {
    if (!data) return null
    const commonProps = { data: data as any, onChange: handleChange }
    switch (template) {
      case 'interior': return <InteriorTemplate {...commonProps} />
      case 'exterior': return <ExteriorTemplate {...commonProps} />
      case 'cabinet': return <CabinetTemplate {...commonProps} />
      default: return <CustomTemplate {...commonProps} />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--sg-surface)', borderBottom: '1px solid var(--sg-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/proposals" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sg-text-2)', fontSize: 13, textDecoration: 'none', padding: '4px 8px', borderRadius: 6 }}
            className="hover:text-white hover:bg-[var(--sg-elevated)] transition-colors">
            <ArrowLeft size={15} /> Back
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--sg-border)' }} />
          <span style={{
            background: 'var(--sg-gold)', color: '#000',
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {TEMPLATE_LABELS[template]}
          </span>
        </div>

        {/* Center */}
        <div style={{ fontSize: 12, color: 'var(--sg-text-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {saveStatus === 'saving' && <><Loader2 size={13} className="animate-spin" style={{ color: 'var(--sg-gold)' }} /> Saving...</>}
          {saveStatus === 'saved' && <><CheckCircle size={13} style={{ color: 'var(--c-sage)' }} /> Saved</>}
          {saveStatus === 'idle' && proposalDbId && <><CheckCircle size={13} style={{ color: 'var(--sg-text-3)' }} /> Auto-save on</>}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Insurance toggle */}
          {data && (
            <button
              onClick={() => handleChange({ showInsurancePage: !data.showInsurancePage })}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: data.showInsurancePage ? 'rgba(122,158,126,0.12)' : 'transparent',
                border: `1px solid ${data.showInsurancePage ? 'var(--sg-sky)' : 'var(--sg-border)'}`,
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: data.showInsurancePage ? 'var(--sg-sky)' : 'var(--sg-text-2)', fontSize: 12,
              }}
            >
              {data.showInsurancePage ? <Eye size={14} /> : <EyeOff size={14} />}
              Insurance Page
            </button>
          )}
          <button
            onClick={handleSaveNow}
            disabled={saveStatus === 'saving'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: '1px solid var(--sg-border)',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              color: 'var(--sg-text-1)', fontSize: 13, fontWeight: 500,
            }}
            className="hover:border-[var(--sg-text-3)] transition-colors"
          >
            <Save size={14} /> Save Draft
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--sg-gold)', border: 'none',
              borderRadius: 8, padding: '6px 16px', cursor: pdfLoading ? 'not-allowed' : 'pointer',
              color: '#000', fontSize: 13, fontWeight: 700,
              opacity: pdfLoading ? 0.7 : 1,
            }}
          >
            {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Document area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '40px 20px 80px',
        display: 'flex', justifyContent: 'center',
      }}>
        {!data ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--sg-gold)' }} />
          </div>
        ) : (
          <div style={{
            background: '#fff',
            width: '100%',
            maxWidth: 794,
            padding: '48px 56px',
            borderRadius: 2,
            boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3)',
            minHeight: '100vh',
          }}>
            {/* Editable field hover hint */}
            <div style={{
              marginBottom: 16, padding: '6px 12px',
              background: 'rgba(139,105,20,0.06)', border: '1px solid rgba(139,105,20,0.15)',
              borderRadius: 4, fontSize: 11, color: 'var(--sg-text-2)', fontFamily: 'sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: 'var(--sg-gold)', fontWeight: 600 }}>✦</span>
              Fields with <span style={{ borderBottom: '1.5px dashed var(--sg-gold)', padding: '0 4px', color: 'var(--sg-gold)' }}>gold underline</span> are editable — click to type
            </div>
            {renderTemplate()}
          </div>
        )}
      </div>
    </div>
  )
}
