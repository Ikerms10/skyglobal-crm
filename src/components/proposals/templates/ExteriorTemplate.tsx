'use client'
import { EditableField } from '../EditableField'
import { EditableTable, LineItem } from '../EditableTable'
import { PaymentSchedule } from '../PaymentSchedule'
import { Lock } from 'lucide-react'

const S = {
  page: {
    background: '#fff',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: '#1a1a1a',
    fontSize: 13,
    lineHeight: 1.6,
  } as React.CSSProperties,
  sectionHeader: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#3583b3',
    borderBottom: '2px solid #3583b3',
    paddingBottom: 4,
    marginBottom: 12,
    marginTop: 24,
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  td: { padding: '7px 10px', border: '1px solid #e5e7eb', verticalAlign: 'middle' as const },
  step: { marginBottom: 14 },
  stepTitle: { fontWeight: 700, color: '#1a1a1a', marginBottom: 4, fontSize: 13 },
  bullet: { marginLeft: 16, marginBottom: 3, color: '#374151' } as React.CSSProperties,
  staticNote: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    color: '#9a9585',
    fontSize: 10,
    fontFamily: 'sans-serif',
    fontStyle: 'normal' as const,
    marginTop: 2,
  },
}

function LockedBadge() {
  return <span style={S.staticNote}><Lock size={10} /> Static — edit in Settings</span>
}

function PageBreak() {
  return (
    <div style={{ borderTop: '3px dashed #e5e7eb', margin: '32px 0', position: 'relative' }}>
      <span style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: '#fff', padding: '0 8px', fontSize: 10, color: '#9ca3af', fontFamily: 'sans-serif' }}>page break</span>
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
    sheen: string
    showInsurancePage: boolean
  }
  onChange: (patch: Partial<Props['data']>) => void
}

const COATING_TIERS = [
  { id: 'tier1', label: 'Tier 1: Latitude®', desc: 'ClimateFlex Technology™ for extreme temperature stability' },
  { id: 'tier2', label: 'Tier 2: Duration®', desc: 'Advanced resin for superior adhesion and mold resistance' },
  { id: 'tier3', label: 'Tier 3: Emerald®', desc: 'Self-cleaning Rain Refresh technology and maximum UV protection' },
]

const SHEEN_OPTIONS = ['Flat', 'Satin', 'Semi-Gloss', 'Gloss']

export function ExteriorTemplate({ data, onChange }: Props) {
  const f = (field: keyof Props['data']) => (val: string | number | LineItem[] | boolean) =>
    onChange({ [field]: val } as any)

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ width: 48, height: 48, background: '#1d1c17', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e6ab35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <LockedBadge />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>SkyGlobal Renovations LLC</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Professional Renovation Services</div>
        </div>
      </div>

      <div style={{ background: '#1d1c17', color: '#e6ab35', padding: '14px 20px', borderRadius: 6, marginBottom: 16, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.04em' }}>
        <EditableField value={data.projectName} onChange={f('projectName')} placeholder="PROJECT NAME / NUMBER" style={{ color: '#e6ab35', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700 }} inputStyle={{ background: '#2e2d26', color: '#e6ab35', border: '1px solid #e6ab35' }} />
        {' '}<span style={{ color: '#9a9585', fontWeight: 400 }}>| EXTERIOR PROTECTION & FINISHING PROPOSAL</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4, fontSize: 12 }}>
        <div><strong>SkyGlobal Renovations LLC</strong><LockedBadge /></div>
        <div style={{ textAlign: 'right' }}>
          <div><strong>Date of Issuance:</strong> <EditableField value={data.issueDate} onChange={f('issueDate')} type="date" placeholder="Select date" /></div>
          <div><strong>Proposal Valid Until:</strong> <EditableField value={data.validUntil} onChange={f('validUntil')} type="date" placeholder="Select date" /></div>
        </div>
      </div>

      <div style={{ background: '#f9f9f7', border: '1px solid #e5e7eb', borderRadius: 4, padding: '8px 12px', marginBottom: 4, fontSize: 11, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5 }}>
        <strong style={{ fontStyle: 'normal', color: '#374151' }}>CONFIDENTIAL:</strong> This proposal and all associated pricing, processes, and materials are proprietary to SkyGlobal Renovations LLC.
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
            ['Project Type', 'Exterior Protection & Level 2 Prep'],
            ['Total Investment', <EditableField key="ti" value={data.totalInvestment != null ? String(data.totalInvestment) : ''} onChange={v => onChange({ totalInvestment: v ? parseFloat(v) : null })} type="number" prefix="$" placeholder="0.00" />],
          ].map(([label, content], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f9f9f7' : '#fff' }}>
              <td style={{ ...S.td, fontWeight: 600, width: '35%', color: '#374151' }}>{label as string}</td>
              <td style={S.td}>{content as React.ReactNode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.sectionHeader}>
        Section III — The SkyGlobal 4-Step Exterior Process
        <LockedBadge />
      </div>
      <p style={{ fontSize: 12, color: '#374151', marginBottom: 10, fontStyle: 'italic' }}>
        Florida's heat, humidity, and UV radiation demand a system — not just a coat of paint.
      </p>
      {[
        { step: 'Step 01: Power Washing — Foundation of Adhesion', bullets: ['Full exterior pressure wash at 2,500–3,500 PSI removing all surface contamination.', 'Soft Chemical Wash: mildicide solution applied to eradicate mold, mildew, and algae at the root.', 'Surfaces allowed to fully dry (24–48 hours) before any paint application.'] },
        { step: 'Step 02: Scraping, Priming & Stabilization', bullets: ['Level 2 Prep: Hand-scraping all peeling and failing paint to create a firm, adherent surface.', 'Remediation: Cracks and gaps filled with SherMax™ elastomeric sealant; checks re-caulked.', 'Priming: All bare wood, concrete, and masonry primed with appropriate system primers.'] },
        { step: 'Step 03: Expert Paint Application', bullets: ['Airless sprayers for uniform, millage-controlled coverage across all surfaces.', 'Full Protection: Complete masking of all windows, doors, fixtures, landscaping, and hardscape.', 'Finishing: Sherwin-Williams premium exterior coatings in HOA-approved colors — back-rolled for penetration.'] },
        { step: 'Step 04: Final Cleanup & Quality Assurance', bullets: ['Complete removal of all masking, drop cloths, and protective materials.', 'Cleaning of plant beds, concrete, and all adjacent surfaces of any overspray.', 'Final Walkthrough: On-site inspection with client to verify satisfaction before sign-off.'] },
      ].map(({ step, bullets }, i) => (
        <div key={i} style={S.step}>
          <div style={S.stepTitle}>{step}</div>
          {bullets.map((b, j) => <div key={j} style={S.bullet}>• {b}</div>)}
        </div>
      ))}

      <PageBreak />

      <div style={S.sectionHeader}>Section IV — Material Specifications & Coating Selection</div>
      <p style={{ fontSize: 12, color: '#374151', marginBottom: 12, fontStyle: 'italic' }}>
        We use <strong style={{ fontStyle: 'normal' }}>Sherwin-Williams</strong> systems engineered for the Florida climate. Select your coating tier:
      </p>

      {COATING_TIERS.map(tier => (
        <label key={tier.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 4, background: data.coatingTier === tier.id ? 'rgba(53,131,179,0.08)' : 'transparent', border: data.coatingTier === tier.id ? '1px solid #3583b3' : '1px solid transparent' }}>
          <input type="radio" name="coatingTier" value={tier.id} checked={data.coatingTier === tier.id} onChange={() => onChange({ coatingTier: tier.id })} style={{ marginTop: 3, accentColor: '#3583b3' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{tier.label}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{tier.desc}</div>
          </div>
        </label>
      ))}

      <div style={{ marginTop: 12, fontSize: 12 }}>
        <strong>Selected Sheen:</strong>{' '}
        <select value={data.sheen} onChange={e => onChange({ sheen: e.target.value })} style={{ background: 'rgba(230,171,53,0.07)', border: '1px solid #e6ab35', borderRadius: 3, color: '#1a1a1a', fontSize: 12, fontFamily: 'Georgia, serif', padding: '2px 6px', outline: 'none' }}>
          {SHEEN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#374151' }}>
        <strong>Sealant:</strong> SherMax™ Urethanized Elastomeric Sealant (Included)
      </div>

      <div style={S.sectionHeader}>Section IV-B — Additional Material Line Items</div>
      <EditableTable items={data.lineItems} onChange={items => onChange({ lineItems: items })} />

      <div style={S.sectionHeader}>Section V — Investment & Payment Schedule</div>
      <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} onDepositChange={v => onChange({ depositPct: v })} onProgressChange={v => onChange({ progressPct: v })} onFinalChange={v => onChange({ finalPct: v })} />

      <div style={S.sectionHeader}>Section VI — Warranty & Provisions<LockedBadge /></div>
      {[
        ['Existing Adhesion Notice', 'Level 2 Prep removes all failing paint. Sound, adhering existing paint is retained as base. Any areas that fail after our work due to pre-existing subsurface failures are outside warranty scope.'],
        ['5-Year Workmanship Warranty', 'All workmanship defects remediated at no cost within 5 years of project completion.'],
        ['Insurance Coverage', '$2,000,000 General Liability. Policy No. CEG-00312198-00. COI available upon request.'],
      ].map(([title, body], i) => (
        <div key={i} style={{ marginBottom: 10, fontSize: 12 }}>
          <strong style={{ color: '#1a1a1a' }}>{i + 1}. {title}:</strong>{' '}
          <span style={{ color: '#374151' }}>{body}</span>
        </div>
      ))}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: 40, fontSize: 12 }}>
          <div><div style={{ borderBottom: '1px solid #1a1a1a', minWidth: 200, paddingBottom: 2, marginBottom: 4 }}>&nbsp;</div><div style={{ color: '#6b7280' }}>Client Acceptance Signature</div></div>
          <div><div style={{ borderBottom: '1px solid #1a1a1a', minWidth: 120, paddingBottom: 2, marginBottom: 4 }}>&nbsp;</div><div style={{ color: '#6b7280' }}>Date</div></div>
        </div>
      </div>

      {data.showInsurancePage && (
        <>
          <PageBreak />
          <div style={S.sectionHeader}>Certificate of Insurance</div>
          <div style={{ border: '2px solid #1d1c17', borderRadius: 6, padding: 20, fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><strong>Insured:</strong> SkyGlobal Renovations LLC<br /><strong>Policy Number:</strong> CEG-00312198-00<br /><strong>Coverage:</strong> $2,000,000 General Liability</div>
              <div><strong>Phone:</strong> 352-782-2460<br /><strong>Email:</strong> skyglobalsvcs@gmail.com</div>
            </div>
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#f9f9f7', borderRadius: 4, fontStyle: 'italic', color: '#6b7280', fontSize: 11 }}>Full COI available upon request.</div>
          </div>
        </>
      )}
    </div>
  )
}
