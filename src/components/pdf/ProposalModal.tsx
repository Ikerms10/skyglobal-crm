'use client'
import { useState, useMemo } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import ProposalDocument, { ProposalServiceType } from './ProposalPDFContent'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  project: { id: string; title: string; address?: string | null; contract_value?: number | null }
  customer: { name?: string | null; phone?: string | null; email?: string | null; address?: string | null }
  lineItems: Array<{ description: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number | null }>
}

const TEMPLATES = [
  { type: 'interior' as ProposalServiceType, icon: '🏠', label: 'Interior', sub: 'Walls, trim & baseboards' },
  { type: 'exterior' as ProposalServiceType, icon: '🌤', label: 'Exterior', sub: 'Full exterior protection' },
  { type: 'cabinets' as ProposalServiceType, icon: '🪵', label: 'Cabinets', sub: 'Factory-grade refinishing' },
]

const COATING_TIERS = ['Latitude®', 'Duration®', 'Emerald®'] as const
const SHEEN_OPTIONS = ['Flat', 'Satin', 'Semi-Gloss'] as const
const CABINET_COATINGS = ['Signature: Emerald® Urethane', 'Elite: Gallery Series™'] as const

const INPUT: React.CSSProperties = {
  background: 'var(--bg-elevated, #252419)',
  border: '1px solid var(--border-subtle, #2e2d26)',
  color: 'var(--text-primary, #efeae2)',
  borderRadius: 8,
  padding: '8px 12px',
  width: '100%',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary, #9a9585)',
  marginBottom: 5,
  display: 'block',
}

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--gold, #c9891a)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10,
}

export function ProposalModal({ isOpen, onClose, project, customer, lineItems }: ProposalModalProps) {
  const [serviceType, setServiceType] = useState<ProposalServiceType>('interior')
  const [clientName, setClientName] = useState(customer.name ?? '')
  const [clientPhone, setClientPhone] = useState(customer.phone ?? '')
  const [projectAddress, setProjectAddress] = useState(project.address ?? customer.address ?? '')
  const [totalInvestment, setTotalInvestment] = useState(
    project.contract_value != null ? String(project.contract_value) : ''
  )
  const [coatingTier, setCoatingTier] = useState<string>('Duration®')
  const [sheen, setSheen] = useState<string>('Satin')
  const [cabinetCoating, setCabinetCoating] = useState<string>('Signature: Emerald® Urethane')
  const [scopeNotes, setScopeNotes] = useState('')

  if (!isOpen) return null

  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined

  const docProps = {
    serviceType,
    project: {
      ...project,
      address: projectAddress || project.address,
      contract_value: totalInvestment !== '' ? parseFloat(totalInvestment) : project.contract_value,
    },
    customer: {
      name: clientName || customer.name || 'Client',
      phone: clientPhone || customer.phone,
      email: customer.email,
    },
    lineItems,
    selectedCoating: serviceType === 'exterior' ? coatingTier : serviceType === 'cabinets' ? cabinetCoating : undefined,
    selectedSheen: serviceType === 'exterior' ? sheen : undefined,
    logoUrl,
  }

  const filename = `SkyGlobal-Proposal-${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}-${(clientName || 'Client').replace(/\s+/g, '-')}.pdf`

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{
          width: 580,
          maxWidth: '100vw',
          height: '100vh',
          background: 'var(--bg-card, #1a1914)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border-subtle, #2e2d26)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold, #c9891a)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              PROPOSAL BUILDER
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #efeae2)' }}>
              {project.title}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary, #5a5649)', cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>

          {/* Template selector */}
          <div style={{ marginBottom: 22 }}>
            <div style={SECTION_TITLE}>SELECT SERVICE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {TEMPLATES.map(t => {
                const active = serviceType === t.type
                return (
                  <button
                    key={t.type}
                    onClick={() => setServiceType(t.type)}
                    style={{
                      padding: '12px 8px',
                      borderRadius: 10,
                      border: active ? '2px solid var(--gold, #c9891a)' : '1px solid var(--border-subtle, #2e2d26)',
                      background: active ? 'rgba(201,137,26,0.1)' : 'var(--bg-elevated, #252419)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 5 }}>{t.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--gold, #c9891a)' : 'var(--text-primary, #efeae2)', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary, #5a5649)', lineHeight: 1.3 }}>{t.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Client info */}
          <div style={{ marginBottom: 22 }}>
            <div style={SECTION_TITLE}>CLIENT DETAILS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={LABEL}>Client Name</label>
                <input style={INPUT} value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label style={LABEL}>Phone</label>
                <input style={INPUT} value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(000) 000-0000" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL}>Project Address</label>
                <input style={INPUT} value={projectAddress} onChange={e => setProjectAddress(e.target.value)} placeholder="Street, City, FL ZIP" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={LABEL}>Total Investment ($)</label>
                <input style={INPUT} type="number" value={totalInvestment} onChange={e => setTotalInvestment(e.target.value)} placeholder="e.g. 4500" />
              </div>
            </div>
          </div>

          {/* Exterior options */}
          {serviceType === 'exterior' && (
            <div style={{ marginBottom: 22 }}>
              <div style={SECTION_TITLE}>COATING SELECTION</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {COATING_TIERS.map(tier => (
                  <button key={tier} onClick={() => setCoatingTier(tier)} style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8,
                    border: coatingTier === tier ? '2px solid var(--gold, #c9891a)' : '1px solid var(--border-subtle, #2e2d26)',
                    background: coatingTier === tier ? 'rgba(201,137,26,0.1)' : 'var(--bg-elevated, #252419)',
                    color: coatingTier === tier ? 'var(--gold, #c9891a)' : 'var(--text-secondary, #9a9585)',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}>{tier}</button>
                ))}
              </div>
              <label style={LABEL}>Sheen</label>
              <select value={sheen} onChange={e => setSheen(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                {SHEEN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {/* Cabinet options */}
          {serviceType === 'cabinets' && (
            <div style={{ marginBottom: 22 }}>
              <div style={SECTION_TITLE}>COATING SELECTION</div>
              {CABINET_COATINGS.map(c => (
                <button key={c} onClick={() => setCabinetCoating(c)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', borderRadius: 8, marginBottom: 8,
                  border: cabinetCoating === c ? '2px solid var(--gold, #c9891a)' : '1px solid var(--border-subtle, #2e2d26)',
                  background: cabinetCoating === c ? 'rgba(201,137,26,0.1)' : 'var(--bg-elevated, #252419)',
                  color: cabinetCoating === c ? 'var(--gold, #c9891a)' : 'var(--text-secondary, #9a9585)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>{c}</button>
              ))}
            </div>
          )}

          {/* Scope notes */}
          <div style={{ marginBottom: 22 }}>
            <div style={SECTION_TITLE}>SCOPE NOTES (OPTIONAL)</div>
            <textarea
              value={scopeNotes}
              onChange={e => setScopeNotes(e.target.value)}
              placeholder="Color selections, room list, special conditions, HOA notes…"
              rows={4}
              style={{ ...INPUT, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-subtle, #2e2d26)', flexShrink: 0, background: 'var(--bg-card, #1a1914)' }}>
          <PDFDownloadLink document={<ProposalDocument {...docProps} />} fileName={filename} style={{ textDecoration: 'none', display: 'block' }}>
            {({ loading }) => (
              <button
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: 9,
                  border: '1px solid var(--gold, #c9891a)',
                  background: loading ? 'var(--bg-elevated, #252419)' : 'rgba(201,137,26,0.15)',
                  color: loading ? 'var(--text-tertiary, #5a5649)' : 'var(--gold, #c9891a)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading ? 'wait' : 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? '⏳  Preparing PDF…' : '📋  Download Proposal PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </div>
    </div>
  )
}
