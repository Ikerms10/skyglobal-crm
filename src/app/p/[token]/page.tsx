'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle, Phone, AlertTriangle, Loader2, RotateCcw } from 'lucide-react'

interface Proposal {
  id: string
  client_name: string | null
  client_address: string | null
  project_name: string | null
  total_investment: number | null
  issue_date: string | null
  valid_until: string | null
  deposit_pct: number
  progress_pct: number
  final_pct: number
  project_scope: string | null
  signed_at: string | null
  status: string
  share_token: string
  line_items?: Array<{
    id: string
    description: string
    quantity: number | null
    unit_price: number | null
    total: number | null
  }>
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

export default function ProposalPortalPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSigning, setIsSigning] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [sigEmpty, setSigEmpty] = useState(true)
  const sigPad = useRef<SignatureCanvas>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals/public?token=${token}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Not found'); return }
      setProposal(json.proposal)
      if (json.proposal.signed_at) setIsSigned(true)
    } catch {
      setError('Unable to load proposal. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const handleClear = () => {
    sigPad.current?.clear()
    setSigEmpty(true)
  }

  const handleSign = async () => {
    if (!sigPad.current || sigPad.current.isEmpty()) return
    setIsSigning(true)
    try {
      const signatureBase64 = sigPad.current.getTrimmedCanvas().toDataURL('image/png')
      const res = await fetch('/api/proposals/signed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signatureBase64 }),
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? 'Failed to save signature. Please try again.')
        return
      }
      setIsSigned(true)
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setIsSigning(false)
    }
  }

  if (loading) {
    return (
      <div style={centerStyle}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#e6ab35' }} />
        <p style={{ marginTop: 16, color: '#6b7280', fontFamily: 'sans-serif' }}>Loading your proposal…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={centerStyle}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 40, maxWidth: 420, textAlign: 'center' }}>
          <AlertTriangle size={40} style={{ color: '#B94A3A', marginBottom: 16 }} />
          <h2 style={{ margin: '0 0 8px', fontFamily: 'sans-serif', color: '#1a1a1a' }}>Proposal Unavailable</h2>
          <p style={{ color: '#6b7280', fontFamily: 'sans-serif', margin: '0 0 24px' }}>{error}</p>
          <p style={{ color: '#6b7280', fontFamily: 'sans-serif', fontSize: 13 }}>
            Questions? Call us at{' '}
            <a href="tel:3527822460" style={{ color: '#e6ab35', fontWeight: 600 }}>352-782-2460</a>
          </p>
        </div>
      </div>
    )
  }

  if (!proposal) return null

  if (isSigned) {
    return (
      <div style={centerStyle}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '48px 40px', maxWidth: 480, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0f9f0', border: '2px solid #4A6741', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} style={{ color: '#4A6741' }} />
          </div>
          <h2 style={{ margin: '0 0 12px', fontFamily: 'sans-serif', fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>
            Thank you, {proposal.client_name?.split(' ')[0] ?? 'there'}!
          </h2>
          <p style={{ color: '#374151', fontFamily: 'sans-serif', margin: '0 0 8px', fontSize: 15 }}>
            Your proposal has been approved.
          </p>
          <p style={{ color: '#6b7280', fontFamily: 'sans-serif', margin: '0 0 32px', fontSize: 14 }}>
            SkyGlobal Renovations will be in touch shortly to confirm next steps.
          </p>
          <a href="tel:3527822460" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#e6ab35', fontFamily: 'sans-serif', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            <Phone size={18} /> 352-782-2460
          </a>
        </div>
      </div>
    )
  }

  const total = proposal.total_investment ?? 0
  const deposit = Math.round(total * (proposal.deposit_pct / 100))
  const progress = Math.round(total * (proposal.progress_pct / 100))
  const final = total - deposit - progress

  return (
    <div style={{ background: '#f9f9f7', minHeight: '100vh', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{ background: '#1d1c17', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#e6ab35', fontFamily: 'sans-serif' }}>SkyGlobal</span>
        <span style={{ color: '#9a9585', fontFamily: 'sans-serif', fontSize: 13 }}>Renovations LLC</span>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 20px' }}>
        {/* Title block */}
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e6ab35', letterSpacing: '0.12em', fontFamily: 'monospace', textTransform: 'uppercase' }}>Proposal</span>
          <h1 style={{ margin: '4px 0 8px', fontSize: 26, fontWeight: 700, color: '#1a1a1a', fontFamily: 'sans-serif' }}>
            {proposal.project_name ?? `Project for ${proposal.client_name}`}
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontFamily: 'sans-serif', fontSize: 14 }}>
            Prepared for {proposal.client_name}
            {proposal.client_address ? ` · ${proposal.client_address}` : ''}
          </p>
        </div>

        {/* Summary card */}
        <div style={card}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <div style={labelStyle}>Total Investment</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#e6ab35', fontFamily: 'monospace' }}>{fmt(total)}</div>
            </div>
            {proposal.issue_date && (
              <div>
                <div style={labelStyle}>Issue Date</div>
                <div style={valueStyle}>{new Date(proposal.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            )}
            {proposal.valid_until && (
              <div>
                <div style={labelStyle}>Valid Until</div>
                <div style={valueStyle}>{new Date(proposal.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            )}
          </div>

          {/* Payment schedule */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
            <div style={labelStyle}>Payment Schedule</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              {[
                { label: `Deposit (${proposal.deposit_pct}%)`, amount: deposit },
                { label: `Progress (${proposal.progress_pct}%)`, amount: progress },
                { label: `Final (${100 - proposal.deposit_pct - proposal.progress_pct}%)`, amount: final },
              ].map(({ label, amount }) => (
                <div key={label} style={{ flex: 1, minWidth: 120, background: '#f9f9f7', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#1a1a1a' }}>{fmt(amount)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Line items */}
        {proposal.line_items && proposal.line_items.length > 0 && (
          <div style={{ ...card, marginTop: 16 }}>
            <h3 style={sectionTitle}>Scope of Work</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['Description', 'Qty', 'Unit Price', 'Total'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Description' ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', fontFamily: 'monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {proposal.line_items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', fontSize: 14, fontFamily: 'sans-serif', color: '#1a1a1a' }}>{item.description}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280' }}>{item.quantity ?? '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontFamily: 'monospace', color: '#6b7280' }}>{item.unit_price != null ? fmt(item.unit_price) : '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 14, fontFamily: 'monospace', fontWeight: 600, color: '#1a1a1a' }}>{item.total != null ? fmt(item.total) : '—'}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f9f9f7' }}>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 14, fontFamily: 'sans-serif' }}>Total</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, fontSize: 16, fontFamily: 'monospace', color: '#e6ab35' }}>{fmt(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Scope notes */}
        {proposal.project_scope && (
          <div style={{ ...card, marginTop: 16 }}>
            <h3 style={sectionTitle}>Project Notes</h3>
            <p style={{ margin: 0, color: '#374151', fontFamily: 'sans-serif', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {proposal.project_scope}
            </p>
          </div>
        )}

        {/* Signature section */}
        <div style={{ ...card, marginTop: 24 }}>
          <h3 style={sectionTitle}>Client Approval</h3>
          <p style={{ margin: '0 0 16px', color: '#6b7280', fontFamily: 'sans-serif', fontSize: 14 }}>
            By signing below, you agree to the scope of work and payment schedule outlined in this proposal.
          </p>

          <div style={{ border: '2px dashed #d1d5db', borderRadius: 8, background: '#fafafa', overflow: 'hidden', position: 'relative', touchAction: 'none' }}>
            <SignatureCanvas
              ref={sigPad}
              canvasProps={{ width: 640, height: 160, style: { width: '100%', height: 160, display: 'block' } }}
              onEnd={() => setSigEmpty(false)}
              penColor="#1a1a1a"
            />
            <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 11, color: '#9ca3af', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
              Sign here
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12 }}>
            <button
              onClick={handleClear}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#6b7280', fontSize: 13, fontFamily: 'sans-serif' }}
            >
              <RotateCcw size={14} /> Clear
            </button>

            <button
              onClick={handleSign}
              disabled={sigEmpty || isSigning}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 28px',
                background: sigEmpty || isSigning ? '#d1d5db' : '#e6ab35',
                border: 'none',
                borderRadius: 8,
                cursor: sigEmpty || isSigning ? 'not-allowed' : 'pointer',
                color: sigEmpty || isSigning ? '#9ca3af' : '#1d1c17',
                fontWeight: 700,
                fontSize: 15,
                fontFamily: 'sans-serif',
                transition: 'background 150ms',
              }}
            >
              {isSigning ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : '✓ Approve & Sign'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', color: '#9ca3af', fontFamily: 'sans-serif', fontSize: 13 }}>
          <p style={{ margin: '0 0 4px' }}>SkyGlobal Renovations LLC</p>
          <p style={{ margin: 0 }}>
            <a href="tel:3527822460" style={{ color: '#e6ab35' }}>352-782-2460</a>
            {' · '}
            <a href="tel:4704699961" style={{ color: '#e6ab35' }}>470-469-9961</a>
            {' · skyglobalsvcs@gmail.com'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#f9f9f7',
  padding: 24,
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 24,
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#9ca3af',
  fontFamily: 'monospace',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 4,
}

const valueStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: '#1a1a1a',
  fontFamily: 'sans-serif',
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 15,
  fontWeight: 700,
  color: '#1a1a1a',
  fontFamily: 'sans-serif',
}
