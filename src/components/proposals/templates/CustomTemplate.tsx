'use client'
import { EditableField } from '../EditableField'
import { EditableTable, LineItem } from '../EditableTable'
import { PaymentSchedule } from '../PaymentSchedule'
import { Lock } from 'lucide-react'

const S = {
  page: { background: '#fff', fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a', fontSize: 13, lineHeight: 1.6 } as React.CSSProperties,
  sectionHeader: { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#3583b3', borderBottom: '2px solid #3583b3', paddingBottom: 4, marginBottom: 12, marginTop: 24 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 },
  td: { padding: '7px 10px', border: '1px solid #e5e7eb', verticalAlign: 'middle' as const },
  staticNote: { display: 'flex' as const, alignItems: 'center' as const, gap: 4, color: '#9a9585', fontSize: 10, fontFamily: 'sans-serif', fontStyle: 'normal' as const, marginTop: 2 },
}

function LockedBadge() { return <span style={S.staticNote}><Lock size={10} /> Static — edit in Settings</span> }
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
    projectScope: string
    totalInvestment: number | null
    depositPct: number
    progressPct: number
    finalPct: number
    lineItems: LineItem[]
    scopeOfWork: string
    showInsurancePage: boolean
  }
  onChange: (patch: Partial<Props['data']>) => void
}

export function CustomTemplate({ data, onChange }: Props) {
  const f = (field: keyof Props['data']) => (val: any) => onChange({ [field]: val })

  return (
    <div style={S.page}>
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
        {' '}<span style={{ color: '#9a9585', fontWeight: 400 }}>| PROFESSIONAL SERVICE PROPOSAL</span>
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
            ['Service Type', <EditableField key="ps" value={data.projectScope} onChange={f('projectScope')} placeholder="e.g. Epoxy Floors, Drywall Repair, Paver Sealing..." />],
            ['Total Investment', <EditableField key="ti" value={data.totalInvestment != null ? String(data.totalInvestment) : ''} onChange={v => onChange({ totalInvestment: v ? parseFloat(v) : null })} type="number" prefix="$" placeholder="0.00" />],
          ].map(([label, content], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f9f9f7' : '#fff' }}>
              <td style={{ ...S.td, fontWeight: 600, width: '35%', color: '#374151' }}>{label as string}</td>
              <td style={S.td}>{content as React.ReactNode}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.sectionHeader}>Section III — Scope of Work</div>
      <p style={{ fontSize: 12, color: '#9a9585', marginBottom: 8, fontFamily: 'sans-serif', fontStyle: 'italic' }}>Describe the full scope, process steps, and deliverables for this project:</p>
      <textarea
        value={data.scopeOfWork}
        onChange={e => onChange({ scopeOfWork: e.target.value })}
        placeholder="Describe the scope of work, process steps, deliverables, timelines, and any special considerations..."
        style={{
          width: '100%',
          minHeight: 200,
          fontFamily: 'Georgia, serif',
          fontSize: 13,
          color: '#1a1a1a',
          border: '1.5px solid #e6ab35',
          borderRadius: 4,
          padding: '10px 12px',
          background: 'rgba(230,171,53,0.04)',
          outline: 'none',
          resize: 'vertical',
          lineHeight: 1.7,
          boxSizing: 'border-box',
        }}
      />

      <PageBreak />

      <div style={S.sectionHeader}>Section IV — Materials & Specifications</div>
      <EditableTable items={data.lineItems} onChange={items => onChange({ lineItems: items })} />

      <div style={S.sectionHeader}>Section V — Investment & Payment Schedule</div>
      <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} onDepositChange={v => onChange({ depositPct: v })} onProgressChange={v => onChange({ progressPct: v })} onFinalChange={v => onChange({ finalPct: v })} />

      <div style={S.sectionHeader}>Section VI — Warranty & Provisions<LockedBadge /></div>
      {[
        ['White Glove Cleanup', '30–45 minutes of dedicated site cleanup performed at the end of each work day.'],
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
