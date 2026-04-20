'use client'
import { EditableField } from '../EditableField'
import { EditableTable, LineItem } from '../EditableTable'
import { PaymentSchedule } from '../PaymentSchedule'
import { ScopeOfWork, ScopeStep } from '../ScopeOfWork'
import { Lock } from 'lucide-react'

const S = {
  page: { background: '#FEFCF8', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1C1209', fontSize: 13, lineHeight: 1.6 } as React.CSSProperties,
  sectionHeader: { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#8B6914', borderBottom: '1px solid #E0D5C7', paddingBottom: 4, marginBottom: 12, marginTop: 24 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  td: { padding: '7px 10px', border: '1px solid #E0D5C7', verticalAlign: 'middle' as const },
  staticNote: { display: 'flex' as const, alignItems: 'center' as const, gap: 4, color: '#A07850', fontSize: 10, fontFamily: 'sans-serif', fontStyle: 'normal' as const, marginTop: 2 },
}

function LockedBadge() { return <span style={S.staticNote}><Lock size={10} /> Static — edit in Settings</span> }
function PageBreak() {
  return (
    <div style={{ borderTop: '3px dashed #E0D5C7', margin: '32px 0', position: 'relative' }}>
      <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: '#FEFCF8', padding: '0 8px', fontSize: 10, color: '#A07850', fontFamily: 'sans-serif' }}>page break</span>
    </div>
  )
}

interface Props {
  data: {
    projectName: string
    issueDate: string
    validUntil: string
    clientName: string
    clientContact: string
    clientAddress: string
    totalInvestment: number | null
    depositPct: number
    progressPct: number
    finalPct: number
    lineItems: LineItem[]
    coatingTier: string
    scopeOfWork: ScopeStep[]
    showInsurancePage: boolean
  }
  onChange: (patch: Partial<Props['data']>) => void
}

const COATING_TIERS = [
  { id: 'signature', label: 'Signature: Emerald® Urethane', desc: 'Hard, non-yellowing urethane finish — high-durability for daily cabinet use' },
  { id: 'elite', label: 'Elite: Gallery Series™', desc: 'KCMA-Compliant. Professional-grade waterborne topcoat with maximum chemical & moisture resistance' },
]

export function CabinetTemplate({ data, onChange }: Props) {
  const f = (field: keyof Props['data']) => (val: any) => onChange({ [field]: val })

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ width: 64, height: 64, background: '#1C1209', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <img src="/skyglobal-logo.svg" width="40" height="40" alt="SkyGlobal" />
          </div>
          <LockedBadge />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1C1209' }}>SkyGlobal Renovations LLC</div>
          <div style={{ fontSize: 11, color: '#A07850', marginTop: 2 }}>Professional Renovation Services</div>
        </div>
      </div>

      {/* Proposal Title Banner */}
      <div style={{ background: '#F0EAE0', borderTop: '3px solid #8B6914', borderBottom: '3px solid #8B6914', padding: '14px 24px', marginBottom: 16, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.04em' }}>
        <EditableField value={data.projectName} onChange={f('projectName')} placeholder="PROJECT NAME / NUMBER" style={{ color: '#8B6914', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700 }} inputStyle={{ background: '#F5ECD8', color: '#8B6914', border: '1px solid #D4A853' }} />
        {' '}<span style={{ color: '#A07850', fontWeight: 400 }}>| CABINET REFINISHING & RESTORATION PROPOSAL</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4, fontSize: 12 }}>
        <div><strong>SkyGlobal Renovations LLC</strong><LockedBadge /></div>
        <div style={{ textAlign: 'right' }}>
          <div><strong>Date of Issuance:</strong> <EditableField value={data.issueDate} onChange={f('issueDate')} type="date" placeholder="Select date" /></div>
          <div><strong>Proposal Valid Until:</strong> <EditableField value={data.validUntil} onChange={f('validUntil')} type="date" placeholder="Select date" /></div>
        </div>
      </div>

      <div style={{ background: '#F5ECD8', borderLeft: '3px solid #D4A853', border: '1px solid #E8D5A3', borderRadius: 4, padding: '8px 12px', marginBottom: 4, fontSize: 11, color: '#A07850', fontStyle: 'italic', lineHeight: 1.5 }}>
        <strong style={{ fontStyle: 'normal', color: '#5C4A38' }}>CONFIDENTIAL:</strong> This proposal and all associated pricing, processes, and materials are proprietary to SkyGlobal Renovations LLC.
      </div>

      <div style={S.sectionHeader}>Section I — Business Contact<LockedBadge /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div>
          <div><strong>Phone:</strong> 352-782-2460 | 470-469-9961</div>
          <div><strong>Email:</strong> skyglobalsvcs@gmail.com</div>
          <div><strong>Web:</strong> skyglobalsvcs.com</div>
        </div>
        <div>
          <div><strong>Instagram & Facebook:</strong> @skyglobalp</div>
          <div><strong>Credentials:</strong> Thumbtack Profile — 75+ Verified Reviews</div>
        </div>
      </div>

      <PageBreak />

      <div style={S.sectionHeader}>Section II — Client & Project Summary</div>
      <table style={S.table}>
        <tbody>
          {[
            ['Client Name', <EditableField key="cn" value={data.clientName} onChange={f('clientName')} placeholder="Client full name" />],
            ['Contact Info', <EditableField key="ci" value={data.clientContact} onChange={f('clientContact')} placeholder="Phone / Email" />],
            ['Project Address', <EditableField key="ca" value={data.clientAddress} onChange={f('clientAddress')} placeholder="Street, City, State ZIP" />],
            ['Project Type', 'Factory-Grade Cabinet Refinishing'],
            ['Total Investment', <EditableField key="ti" value={data.totalInvestment != null ? String(data.totalInvestment) : ''} onChange={v => onChange({ totalInvestment: v ? parseFloat(v) : null })} type="number" prefix="$" placeholder="0.00" />],
          ].map(([label, content], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#F5ECD8' : '#FEFCF8' }}>
              <td style={{ ...S.td, fontWeight: 600, width: '35%', color: '#5C4A38' }}>{label as string}</td>
              <td style={S.td}>{content as React.ReactNode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.sectionHeader}>Section III — The SkyGlobal 10-Phase Refinishing Process</div>
      <p style={{ fontSize: 12, color: '#5C4A38', marginBottom: 10, fontStyle: 'italic' }}>
        We don't just paint cabinets; we refinish them to a factory-grade standard using industrial coatings and a professional spray environment.
      </p>
      <ScopeOfWork
        steps={data.scopeOfWork}
        onChange={steps => onChange({ scopeOfWork: steps })}
      />

      <PageBreak />

      <div style={S.sectionHeader}>Section IV — Coating Specifications</div>
      <p style={{ fontSize: 12, color: '#5C4A38', marginBottom: 12, fontStyle: 'italic' }}>
        Select the level of protection engineered for your kitchen environment:
      </p>

      {COATING_TIERS.map(tier => (
        <label key={tier.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer',
          padding: '8px 10px', borderRadius: 4,
          background: data.coatingTier === tier.id ? 'rgba(74,103,65,0.08)' : 'transparent',
          border: data.coatingTier === tier.id ? '1px solid #4A6741' : '1px solid transparent',
        }}>
          <input type="radio" name="cabinetCoating" value={tier.id} checked={data.coatingTier === tier.id} onChange={() => onChange({ coatingTier: tier.id })} style={{ marginTop: 3, accentColor: '#4A6741' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{tier.label}</div>
            <div style={{ fontSize: 11, color: '#A07850', marginTop: 1 }}>{tier.desc}</div>
          </div>
        </label>
      ))}

      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.8, color: '#5C4A38' }}>
        <div><strong>Primer System:</strong> Renner Wood Coatings Industrial Bonding Primer (Included)</div>
        <div><strong>Sanding System:</strong> EKASANDER Dustless Orbital System (Included)</div>
      </div>

      <div style={S.sectionHeader}>Section IV-B — Additional Material Line Items</div>
      <EditableTable items={data.lineItems} onChange={items => onChange({ lineItems: items })} />

      <div style={S.sectionHeader}>Section V — Investment & Payment Schedule</div>
      <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} onDepositChange={v => onChange({ depositPct: v })} onProgressChange={v => onChange({ progressPct: v })} onFinalChange={v => onChange({ finalPct: v })} />

      <div style={S.sectionHeader}>Section VI — Warranty & Provisions<LockedBadge /></div>
      {[
        ['White Glove Cleanup', '30–45 minutes of dedicated site cleanup at end of each work day. Your kitchen will be usable throughout the process.'],
        ['5-Year Workmanship Warranty', 'All workmanship defects remediated at no cost within 5 years. Applies to adhesion failures, topcoat cracking, and finish delamination under normal use.'],
        ['Insurance Coverage', '$2,000,000 General Liability. Policy No. CEG-00312198-00. COI available upon request.'],
        ['Coating Cure Maintenance', 'No abrasive cleaners, rough sponges, or harsh chemicals for 30 days while coating fully cures. Standard dish soap and soft cloth recommended during cure period.'],
      ].map(([title, body], i) => (
        <div key={i} style={{ marginBottom: 10, fontSize: 12 }}>
          <strong style={{ color: '#1C1209' }}>{i + 1}. {title}:</strong>{' '}
          <span style={{ color: '#5C4A38' }}>{body}</span>
        </div>
      ))}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #E0D5C7' }}>
        <div style={{ display: 'flex', gap: 40, fontSize: 12 }}>
          <div><div style={{ borderBottom: '1px solid #1C1209', minWidth: 200, paddingBottom: 2, marginBottom: 4 }}>&nbsp;</div><div style={{ color: '#A07850' }}>Client Acceptance Signature</div></div>
          <div><div style={{ borderBottom: '1px solid #1C1209', minWidth: 120, paddingBottom: 2, marginBottom: 4 }}>&nbsp;</div><div style={{ color: '#A07850' }}>Date</div></div>
        </div>
      </div>

      {data.showInsurancePage && (
        <>
          <PageBreak />
          <div style={S.sectionHeader}>Certificate of Insurance</div>
          <div style={{ border: '1px solid #E0D5C7', borderLeft: '3px solid #4A6741', borderRadius: 6, padding: 20, fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><strong>Insured:</strong> SkyGlobal Renovations LLC<br /><strong>Policy Number:</strong> CEG-00312198-00<br /><strong>Coverage:</strong> $2,000,000 General Liability</div>
              <div><strong>Phone:</strong> 352-782-2460<br /><strong>Email:</strong> skyglobalsvcs@gmail.com</div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#F5ECD8', borderRadius: 4, fontStyle: 'italic', color: '#A07850', fontSize: 11 }}>Full COI available upon request.</div>
          </div>
        </>
      )}
    </div>
  )
}
