'use client'
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer'
import { LineItem } from './EditableTable'
import { ProposalTemplate } from '@/types'

// ─── DESIGN TOKENS — all hardcoded hex (CSS vars don't work in @react-pdf) ───
const DARK      = '#1d1c17'
const GOLD      = '#e6ab35'
const GOLD_DARK = '#b8891f'
const GOLD_BG   = '#fdf8ed'
const TEXT      = '#1d1c17'  // primary — near-black
const TEXT_BODY = '#3a3028'  // body paragraphs — warm dark brown
const TEXT_MUTED= '#5c5240'  // captions/secondary
const WHITE     = '#ffffff'
const SURFACE   = '#faf8f4'  // alternating table row
const BORDER    = '#e8e0d0'
const GREEN     = '#1a7a3c'
const GREEN_BG  = '#f0faf4'
const BLUE      = '#2d6fa3'
const BLUE_BG   = '#f0f5fb'

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 10, color: TEXT,
    backgroundColor: WHITE, paddingBottom: 44,
  },
  // Header
  darkHeader: {
    backgroundColor: DARK, padding: '20 32',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  logoBox: {
    width: 48, height: 48, backgroundColor: GOLD, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  logoInitial: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: DARK },
  companyRight: { alignItems: 'flex-end' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: WHITE, lineHeight: 1.1 },
  companyMeta: { fontSize: 8, color: '#a09070', marginTop: 3, lineHeight: 1.5 },
  goldRule: { height: 3, backgroundColor: GOLD },
  // Title bar
  titleBar: {
    backgroundColor: DARK, padding: '10 24',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 0,
  },
  titleText: {
    fontSize: 11, fontFamily: 'Helvetica-Bold', color: GOLD,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  titleDates: { fontSize: 8, color: '#a09070', textAlign: 'right' },
  // Body
  body: { padding: '16 32' },
  // Section header
  sectionHeader: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase',
    color: GOLD_DARK, letterSpacing: 1, marginBottom: 4, marginTop: 16,
  },
  sectionRule: { height: 1.5, backgroundColor: GOLD, marginBottom: 10 },
  // Confidential box
  confBox: {
    backgroundColor: GOLD_BG, borderLeft: `3 solid ${GOLD}`,
    padding: '7 12', marginBottom: 10, marginTop: 6,
  },
  confText: { fontSize: 8, color: TEXT_BODY, lineHeight: 1.5 },
  // Two-column layout
  twoCol: { flexDirection: 'row', justifyContent: 'space-between' },
  // Tables
  tableRow: { flexDirection: 'row', borderBottom: `1 solid ${BORDER}` },
  tableLabel: {
    width: '34%', padding: '6 10', fontFamily: 'Helvetica-Bold',
    fontSize: 9, color: TEXT, backgroundColor: SURFACE,
    borderRight: `2 solid ${GOLD}`,
  },
  tableValue: { width: '66%', padding: '6 10', fontSize: 9, color: TEXT_BODY },
  // Line items table
  lineHeader: { flexDirection: 'row', backgroundColor: DARK },
  lineHeaderCell: {
    padding: '6 8', color: WHITE,
    fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.4,
  },
  lineRow: { flexDirection: 'row', borderBottom: `1 solid ${BORDER}` },
  lineCell: { padding: '6 8', fontSize: 9, color: TEXT_BODY },
  lineTotal: { padding: '6 8', fontSize: 9, color: TEXT, fontFamily: 'Helvetica-Bold' },
  lineSubtotalRow: {
    flexDirection: 'row', backgroundColor: GOLD_BG,
    borderTop: `1.5 solid ${GOLD}`,
  },
  // Process steps
  stepTitle: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT,
    marginBottom: 3, flexDirection: 'row', alignItems: 'center',
  },
  stepBadge: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center', marginRight: 7,
    flexShrink: 0,
  },
  stepBadgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  bullet: { fontSize: 9, color: TEXT_BODY, marginBottom: 2.5, marginLeft: 22 },
  // Payment schedule blocks
  payBlock: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: '10 14', marginBottom: 1,
  },
  payLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT },
  payWhen: { fontSize: 8, color: TEXT_MUTED, marginTop: 1 },
  payAmount: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  totalBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK, padding: '10 14', borderRadius: 4, marginTop: 4,
  },
  totalLabel: {
    fontSize: 10, fontFamily: 'Helvetica-Bold', color: GOLD,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  totalAmount: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: WHITE },
  // Warranty
  warrantyBlock: {
    flexDirection: 'row', padding: '8 12', marginBottom: 6,
    backgroundColor: SURFACE, borderLeft: `3 solid ${GOLD}`,
    borderRadius: 2,
  },
  warrantyBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    marginRight: 10, marginTop: 1,
  },
  warrantyBadgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: DARK },
  warrantyTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 2 },
  warrantyBody: { fontSize: 9, color: TEXT_BODY, lineHeight: 1.5 },
  // Signature
  sigBox: { flexDirection: 'row', marginTop: 20, paddingTop: 12, borderTop: `1 solid ${BORDER}` },
  sigLine: {
    borderBottom: `1.5 solid ${TEXT}`, marginBottom: 4,
    height: 28,
  },
  sigLabel: { fontSize: 8, color: TEXT_MUTED },
  // Insurance page
  insCard: {
    border: `1.5 solid ${BORDER}`, borderLeft: `5 solid ${GOLD}`,
    borderRadius: 4, marginBottom: 16,
  },
  insCardHeader: { backgroundColor: GOLD_BG, padding: '10 16', borderBottom: `1 solid ${BORDER}` },
  insCardHeaderText: {
    fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  insGrid: { padding: '14 16', flexDirection: 'row', flexWrap: 'wrap' },
  insField: { width: '50%', marginBottom: 10 },
  insFieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 1 },
  insFieldValue: { fontSize: 9, color: TEXT_BODY },
  insNote: { backgroundColor: GOLD_BG, padding: '10 14', borderRadius: 3 },
  insNoteText: { fontSize: 8.5, color: TEXT_BODY, fontStyle: 'italic', lineHeight: 1.6 },
  // Footer
  footer: {
    position: 'absolute', bottom: 16, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTop: `1 solid ${BORDER}`, paddingTop: 6,
    fontSize: 7.5, color: TEXT_MUTED,
  },
  footerBrand: { fontSize: 7.5, color: GOLD_DARK, fontFamily: 'Helvetica-Bold' },
  // Finance note
  financeNote: { fontSize: 8, color: TEXT_MUTED, fontStyle: 'italic', marginTop: 8, lineHeight: 1.5 },
})

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ─── INTERFACE ───────────────────────────────────────────────────────────────
export interface BusinessInfo {
  name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  logoUrl?: string | null       // accepts base64 data URI or URL
  insurancePolicy?: string | null
  insuranceLimit?: string | null
  warrantyYears?: string | null
}

// ─── SHARED SUB-COMPONENTS ───────────────────────────────────────────────────
function DocHeader({ business, projectName, issueDate, validUntil, proposalType }: {
  business: BusinessInfo
  projectName?: string
  issueDate?: string
  validUntil?: string
  proposalType?: string
}) {
  const metaParts = [business.address, business.phone, business.website].filter(Boolean)
  const initial = (business.name?.[0] ?? 'B').toUpperCase()

  return (
    <>
      {/* Dark top bar — logo + name together on left, proposal label on right */}
      <View style={s.darkHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {business.logoUrl ? (
            <Image src={business.logoUrl} style={{ height: 52, width: 52, objectFit: 'contain', marginRight: 14, borderRadius: 4 }} />
          ) : (
            <View style={[s.logoBox, { marginRight: 14 }]}>
              <Text style={s.logoInitial}>{initial}</Text>
            </View>
          )}
          <View>
            <Text style={s.companyName}>{business.name}</Text>
            {metaParts.length > 0 && (
              <Text style={s.companyMeta}>{metaParts.join(' · ')}</Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
            Professional Proposal
          </Text>
          {issueDate && <Text style={s.titleDates}>Issued: {issueDate}</Text>}
          {validUntil && <Text style={s.titleDates}>Valid until: {validUntil}</Text>}
        </View>
      </View>

      {/* Gold rule */}
      <View style={s.goldRule} />

      {/* Title bar — project name + type */}
      <View style={s.titleBar}>
        <Text style={s.titleText}>
          {(projectName || 'Professional Service Proposal').toUpperCase()}
          {proposalType ? ` | ${proposalType}` : ''}
        </Text>
      </View>
    </>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View>
      <Text style={s.sectionHeader}>{title}</Text>
      <View style={s.sectionRule} />
    </View>
  )
}

function BusinessContact({ business }: { business: BusinessInfo }) {
  const fields = [
    business.phone  && ['Phone', business.phone],
    business.email  && ['Email', business.email],
    business.website&& ['Web',   business.website],
    business.address&& ['Address', business.address],
  ].filter(Boolean) as [string, string][]

  if (fields.length === 0) return null

  return (
    <View style={{ marginTop: 10 }}>
      <SectionHeader title="Section I — Business Contact" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {fields.map(([label, value]) => (
          <View key={label} style={{ width: '50%', marginBottom: 4 }}>
            <Text style={{ fontSize: 9, color: TEXT }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>{label}: </Text>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ClientSummary({ clientName, clientContact, clientAddress, projectScope, total }: any) {
  const rows: [string, string, boolean?][] = [
    ['Client Name',           clientName    || '—'],
    ['Contact Info',          clientContact || '—'],
    ['Project Address',       clientAddress || '—'],
    ['Project Scope / Type',  projectScope  || '—'],
    ['Total Investment',      total != null ? fmt(parseFloat(String(total))) : '—', true],
  ]
  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeader title="Section II — Client & Project Summary" />
      <View style={{ border: `1 solid ${BORDER}` }}>
        {rows.map(([label, val, highlight], i) => (
          <View key={i} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? SURFACE : WHITE }]}>
            <Text style={s.tableLabel}>{label}</Text>
            <Text style={[s.tableValue, highlight ? { fontFamily: 'Helvetica-Bold', color: GREEN, fontSize: 11 } : {}]}>
              {val}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ProcessSteps({ title, steps }: {
  title: string
  steps: Array<{ title: string; bullets: string[] }>
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeader title={title} />
      {steps.map((step, i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3 }}>
            <View style={s.stepBadge}>
              <Text style={s.stepBadgeText}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: TEXT, paddingTop: 1 }}>
              {step.title}
            </Text>
          </View>
          {step.bullets.map((b, j) => (
            <Text key={j} style={s.bullet}>• {b}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}

function MaterialsSection({ items, sectionTitle, coatingNote }: {
  items: LineItem[]
  sectionTitle: string
  coatingNote?: string
}) {
  const lineTotal = items.reduce((s, item) => s + (item.total ?? 0), 0)

  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeader title={sectionTitle} />
      {coatingNote && (
        <Text style={{ fontSize: 9, color: TEXT_BODY, marginBottom: 8 }}>{coatingNote}</Text>
      )}
      <Text style={{ fontSize: 8.5, color: TEXT_BODY, fontStyle: 'italic', marginBottom: 8 }}>
        Exclusive Sherwin-Williams products · <Text style={{ fontFamily: 'Helvetica-Bold', fontStyle: 'normal', color: TEXT }}>Zero Material Markup</Text> — direct contractor pricing passed to you.
      </Text>
      {items.length > 0 ? (
        <View style={{ border: `1 solid ${BORDER}` }}>
          {/* Header */}
          <View style={s.lineHeader}>
            <Text style={[s.lineHeaderCell, { width: '50%' }]}>Description</Text>
            <Text style={[s.lineHeaderCell, { width: '12%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.lineHeaderCell, { width: '20%', textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[s.lineHeaderCell, { width: '18%', textAlign: 'right', backgroundColor: GOLD, color: DARK }]}>Total</Text>
          </View>
          {/* Rows */}
          {items.map((item, i) => (
            <View key={item.id ?? i} style={[s.lineRow, { backgroundColor: i % 2 === 0 ? WHITE : SURFACE }]}>
              <Text style={[s.lineCell, { width: '50%' }]}>{item.description || '—'}</Text>
              <Text style={[s.lineCell, { width: '12%', textAlign: 'center' }]}>{item.quantity ?? '—'}</Text>
              <Text style={[s.lineCell, { width: '20%', textAlign: 'right' }]}>
                {item.unit_price != null ? fmt(item.unit_price) : '—'}
              </Text>
              <Text style={[s.lineTotal, { width: '18%', textAlign: 'right' }]}>
                {item.total != null
                  ? fmt(item.total)
                  : item.description?.toLowerCase().includes('included')
                  ? 'Incl.'
                  : '—'}
              </Text>
            </View>
          ))}
          {/* Subtotal */}
          <View style={s.lineSubtotalRow}>
            <Text style={[s.lineCell, { width: '82%', textAlign: 'right', fontFamily: 'Helvetica-Bold', color: TEXT }]}>
              Materials Subtotal:
            </Text>
            <Text style={[s.lineTotal, { width: '18%', textAlign: 'right', color: TEXT }]}>
              {fmt(lineTotal)}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={{ fontSize: 9, color: TEXT_MUTED, fontStyle: 'italic' }}>No materials listed.</Text>
      )}
    </View>
  )
}

function PaymentSchedule({ total, depositPct, progressPct, finalPct, business }: any) {
  const t = parseFloat(String(total ?? 0)) || 0
  const dep  = t * (depositPct  / 100)
  const prog = t * (progressPct / 100)
  const fin  = t - dep - prog

  const blocks = [
    { label: `Initial Deposit (${depositPct}%)`,    when: 'Due 48 hours prior to project start', amount: dep,  bg: GREEN_BG,  amountColor: GREEN },
    { label: `Progress Payment (${progressPct}%)`,   when: 'Due upon 50% project completion',     amount: prog, bg: GOLD_BG,   amountColor: GOLD_DARK },
    { label: `Final Balance (${finalPct}%)`,          when: 'Due upon completion & walkthrough',   amount: fin,  bg: BLUE_BG,   amountColor: BLUE },
  ]

  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeader title="Section V — Investment & Payment Schedule" />
      <View style={{ border: `1 solid ${BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
        {blocks.map((b, i) => (
          <View key={i} style={[s.payBlock, { backgroundColor: b.bg, borderBottom: i < 2 ? `1 solid ${BORDER}` : 'none' }]}>
            <View>
              <Text style={s.payLabel}>{b.label}</Text>
              <Text style={s.payWhen}>{b.when}</Text>
            </View>
            <Text style={[s.payAmount, { color: b.amountColor }]}>
              {t > 0 ? fmt(b.amount) : 'TBD'}
            </Text>
          </View>
        ))}
      </View>
      {t > 0 && (
        <View style={s.totalBar}>
          <Text style={s.totalLabel}>Total Investment</Text>
          <Text style={s.totalAmount}>{fmt(t)}</Text>
        </View>
      )}
      <Text style={s.financeNote}>
        {business?.name ?? 'We'} operate with full financial transparency. All material costs
        are invoiced at direct Sherwin-Williams contractor pricing with zero markup.
        Labor and overhead itemized and available upon request.
      </Text>
    </View>
  )
}

function WarrantySection({ items, warrantyYears }: {
  items: Array<{ title: string; body: string }>
  warrantyYears?: string | null
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <SectionHeader title="Section VI — Warranty & Provisions" />
      {items.map((item, i) => (
        <View key={i} style={s.warrantyBlock}>
          <View style={s.warrantyBadge}>
            <Text style={s.warrantyBadgeText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.warrantyTitle}>{item.title}</Text>
            <Text style={s.warrantyBody}>{item.body}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function SignatureBlock() {
  return (
    <View style={s.sigBox}>
      <View style={{ flex: 2, marginRight: 40 }}>
        <View style={[s.sigLine, { width: '100%' }]} />
        <Text style={s.sigLabel}>Client Acceptance Signature</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={[s.sigLine, { width: '100%' }]} />
        <Text style={s.sigLabel}>Date</Text>
      </View>
    </View>
  )
}

function DocFooter({ business, pageNum, totalPages }: {
  business: BusinessInfo
  pageNum: number
  totalPages: number
}) {
  return (
    <View style={s.footer} fixed>
      <Text>{business.name} · Confidential</Text>
      <Text style={s.footerBrand}>Powered by SkyGlobal CRM</Text>
      <Text>Page {pageNum} of {totalPages}</Text>
    </View>
  )
}

function InsurancePage({ business }: { business: BusinessInfo }) {
  const initial = (business.name?.[0] ?? 'B').toUpperCase()
  const fields: [string, string][] = [
    ['Insured',           business.name],
    ['Coverage Type',     'General Liability'],
    ['Policy Number',     business.insurancePolicy || 'On file'],
    ['Coverage Limit',    business.insuranceLimit  || '$2,000,000'],
    ['Phone',             business.phone            || '—'],
    ['Email',             business.email            || '—'],
    ['Effective Date',    'On file'],
    ['Expiration Date',   'On file'],
  ]
  return (
    <Page size="LETTER" style={s.page}>
      {/* Mini header */}
      <View style={[s.darkHeader, { paddingTop: 16, paddingBottom: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {business.logoUrl ? (
            <Image src={business.logoUrl} style={{ height: 36, width: 36, objectFit: 'contain', marginRight: 10 }} />
          ) : (
            <View style={[s.logoBox, { width: 36, height: 36, marginRight: 10 }]}>
              <Text style={[s.logoInitial, { fontSize: 16 }]}>{initial}</Text>
            </View>
          )}
          <View>
            <Text style={[s.companyName, { fontSize: 14 }]}>{business.name}</Text>
            <Text style={s.companyMeta}>Certificate of Insurance</Text>
          </View>
        </View>
      </View>
      <View style={s.goldRule} />

      <View style={s.body}>
        <View style={{ marginTop: 8 }}>
          <SectionHeader title="Certificate of Insurance" />
        </View>

        {/* Insurance card */}
        <View style={s.insCard}>
          <View style={s.insCardHeader}>
            <Text style={s.insCardHeaderText}>Insurance Details</Text>
          </View>
          <View style={s.insGrid}>
            {fields.map(([label, value]) => (
              <View key={label} style={s.insField}>
                <Text style={s.insFieldLabel}>{label}</Text>
                <Text style={s.insFieldValue}>{value || '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={s.insNote}>
          <Text style={s.insNoteText}>
            A full Certificate of Insurance (COI) is available upon request and can be sent
            directly to the client, property manager, or HOA. {business.name} maintains active
            coverage on all active project sites.
          </Text>
        </View>
      </View>

      <DocFooter business={business} pageNum={3} totalPages={3} />
    </Page>
  )
}

// ─── INTERIOR ────────────────────────────────────────────────────────────────
const INTERIOR_STEPS = [
  {
    title: 'Protection & Site Preparation',
    bullets: [
      'Full environment shielding: furniture, flooring, fixtures, and hardware masked and protected with professional drop cloths and plastic sheeting.',
      'Surface cleaning: all paintable surfaces wiped clean of dust, grease, and contaminants prior to any application.',
      'Tape and masking of all trim, outlets, windows, and doors for razor-sharp edge lines.',
    ],
  },
  {
    title: 'Surface Remediation & Priming',
    bullets: [
      'Drywall restoration: holes, cracks, nail pops, and imperfections filled, sanded flush, and feathered for seamless adhesion.',
      'Caulking: all gaps at trim, baseboards, and window frames sealed with professional paintable caulk.',
      'Stain-blocking primer applied to all repaired areas and bare surfaces.',
    ],
  },
  {
    title: 'Premium Paint Application',
    bullets: [
      'Two full coats of Sherwin-Williams premium interior paint applied with professional-grade rollers and brushes.',
      'Cut-in technique at all transitions — ceilings, trim, doors, windows — for clean sharp lines.',
      'Each coat allowed full dry time before the next is applied. No shortcuts.',
    ],
  },
  {
    title: 'Site Restoration & Quality Control',
    bullets: [
      'All masking, tape, and drop cloths removed carefully to avoid damage.',
      'Surfaces wiped clean; furniture returned; work area left spotless.',
      'Final walkthrough: on-site inspection with client to verify satisfaction and address touch-up items before departure.',
    ],
  },
]

const EXTERIOR_STEPS = [
  {
    title: 'Power Washing & Chemical Treatment',
    bullets: [
      'Full exterior pressure wash at 2,500–3,500 PSI to strip dirt, grime, and loose paint.',
      'Soft chemical wash with mildicide solution to eradicate mold, algae, and biological growth.',
    ],
  },
  {
    title: 'Scraping, Priming & Stabilization',
    bullets: [
      'Level 2 prep: hand-scraping all peeling and failing paint to a stable substrate.',
      'Elastomeric sealant applied to all cracks, gaps, and penetrations.',
      'Bonding primer applied to bare wood and repaired areas for maximum adhesion.',
    ],
  },
  {
    title: 'Expert Coating Application',
    bullets: [
      'Airless sprayers for uniform, millage-controlled coverage on large surfaces.',
      'Back-rolled for penetration and brushed for detail work on trim and accents.',
      'Premium Sherwin-Williams exterior coating in HOA-approved colors.',
    ],
  },
  {
    title: 'Final Cleanup & Quality Assurance',
    bullets: [
      'Complete removal of all masking, protective materials, and debris.',
      'Final walkthrough with client and immediate touch-up of any noted items before sign-off.',
    ],
  },
]

const CABINET_STEPS = [
  {
    title: 'Teardown & Precision Labeling',
    bullets: [
      'Careful removal of all cabinet doors and drawer fronts.',
      'Proprietary numbering and labeling system ensures exact reinstallation to original positions.',
    ],
  },
  {
    title: 'Surface Preparation & Chemical Degreasing',
    bullets: [
      'Chemical degreasing to strip cooking oils, grease, and contaminants from all surfaces.',
      'EKASANDER dustless orbital sanding system for a clean, bondable substrate.',
    ],
  },
  {
    title: 'Industrial Primer System',
    bullets: [
      '2-coat bonding primer system applied in our controlled shop environment.',
      'Tannin-blocking primer on oak and pine to prevent bleed-through. Inter-coat sanding at 320 grit.',
    ],
  },
  {
    title: 'HVLP Topcoat & White-Glove Reinstallation',
    bullets: [
      'HVLP fine-finish spraying for factory-smooth, brush-mark-free finish.',
      'White-glove reinstallation: every door and drawer returned to exact specifications.',
    ],
  },
]

// ─── TEMPLATE BUILDERS ───────────────────────────────────────────────────────
function InteriorPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const totalPages = data.showInsurancePage ? 3 : 2
  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated site cleanup at the end of each work day. Your home is left as clean as we found it — every day.' },
    { title: `${data.warrantyYears ?? business.warrantyYears ?? '5'}-Year Workmanship Warranty`,
      body: `${business.name} provides a ${data.warrantyYears ?? business.warrantyYears ?? '5'}-year warranty on all workmanship. Any defects in application, adhesion, or finish remediated at no cost.` },
    { title: 'Insurance Coverage',
      body: `${business.name} carries ${business.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${business.insurancePolicy ? ' Policy No. ' + business.insurancePolicy + '.' : ''} COI available upon request.` },
  ]
  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="LETTER" style={s.page}>
        <DocHeader business={business} projectName={data.projectName} proposalType="INTERIOR PAINTING" issueDate={data.issueDate} validUntil={data.validUntil} />
        <View style={s.body}>
          {/* Confidential */}
          <View style={s.confBox}>
            <Text style={s.confText}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: TEXT }}>CONFIDENTIAL: </Text>
              This proposal and all associated pricing, processes, and materials are proprietary to {business.name}.
              This document may not be reproduced or shared without written authorization.
            </Text>
          </View>
          <BusinessContact business={business} />
          <ClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope={data.projectScope} total={data.totalInvestment} />
          <ProcessSteps title={`Section III — The ${business.name} Interior Process`} steps={INTERIOR_STEPS} />
        </View>
        <DocFooter business={business} pageNum={1} totalPages={totalPages} />
      </Page>

      {/* PAGE 2 */}
      <Page size="LETTER" style={s.page}>
        <View style={s.body}>
          <MaterialsSection items={data.lineItems ?? []} sectionTitle="Section IV — Material Specifications" />
          <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
          <WarrantySection items={warrantyItems} />
          <SignatureBlock />
        </View>
        <DocFooter business={business} pageNum={2} totalPages={totalPages} />
      </Page>

      {/* PAGE 3 — COI */}
      {data.showInsurancePage && <InsurancePage business={business} />}
    </Document>
  )
}

function ExteriorPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const totalPages = data.showInsurancePage ? 3 : 2
  const tierNames: Record<string, string> = {
    tier1: 'Tier 1: Latitude® — Entry Durability',
    tier2: 'Tier 2: Duration® — Professional Grade',
    tier3: 'Tier 3: Emerald® — Maximum Protection',
  }
  const coatingNote = [
    data.coatingTier && `Coating Tier: ${tierNames[data.coatingTier] || data.coatingTier}`,
    data.sheen && `Sheen: ${data.sheen}`,
  ].filter(Boolean).join(' · ')

  const warrantyItems = [
    { title: `${data.warrantyYears ?? business.warrantyYears ?? '5'}-Year Workmanship Warranty`,
      body: `All exterior workmanship defects remediated at no cost within ${data.warrantyYears ?? business.warrantyYears ?? '5'} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${business.name} carries ${business.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${business.insurancePolicy ? ' Policy No. ' + business.insurancePolicy + '.' : ''} COI available upon request.` },
  ]
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <DocHeader business={business} projectName={data.projectName} proposalType="EXTERIOR PROTECTION & FINISHING" issueDate={data.issueDate} validUntil={data.validUntil} />
        <View style={s.body}>
          <View style={s.confBox}>
            <Text style={s.confText}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: TEXT }}>CONFIDENTIAL: </Text>
              This proposal and all associated pricing, processes, and materials are proprietary to {business.name}.
            </Text>
          </View>
          <BusinessContact business={business} />
          <ClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope="Exterior Protection & Level 2 Prep" total={data.totalInvestment} />
          <ProcessSteps title={`Section III — The ${business.name} Exterior Process`} steps={EXTERIOR_STEPS} />
        </View>
        <DocFooter business={business} pageNum={1} totalPages={totalPages} />
      </Page>
      <Page size="LETTER" style={s.page}>
        <View style={s.body}>
          <MaterialsSection items={data.lineItems ?? []} sectionTitle="Section IV — Material Specifications" coatingNote={coatingNote || undefined} />
          <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
          <WarrantySection items={warrantyItems} />
          <SignatureBlock />
        </View>
        <DocFooter business={business} pageNum={2} totalPages={totalPages} />
      </Page>
      {data.showInsurancePage && <InsurancePage business={business} />}
    </Document>
  )
}

function CabinetPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const totalPages = data.showInsurancePage ? 3 : 2
  const tierNames: Record<string, string> = {
    signature: 'Signature Tier: Emerald® Urethane Enamel',
    elite:     'Elite Tier: Gallery Series™ by Benjamin Moore',
  }
  const coatingNote = data.coatingTier ? `Selected Coating: ${tierNames[data.coatingTier] || data.coatingTier}` : undefined
  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated cleanup performed daily. Your kitchen is left pristine at end of every work day.' },
    { title: `${data.warrantyYears ?? business.warrantyYears ?? '5'}-Year Workmanship Warranty`,
      body: `All cabinet refinishing defects remediated at no cost within ${data.warrantyYears ?? business.warrantyYears ?? '5'} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${business.name} carries ${business.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${business.insurancePolicy ? ' Policy No. ' + business.insurancePolicy + '.' : ''} COI available upon request.` },
    { title: 'Coating Cure Maintenance',
      body: 'No abrasive cleaners or harsh chemicals for 30 days while the coating fully cures to maximum hardness.' },
  ]
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <DocHeader business={business} projectName={data.projectName} proposalType="CABINET REFINISHING & RESTORATION" issueDate={data.issueDate} validUntil={data.validUntil} />
        <View style={s.body}>
          <View style={s.confBox}>
            <Text style={s.confText}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: TEXT }}>CONFIDENTIAL: </Text>
              This proposal and all associated pricing, processes, and materials are proprietary to {business.name}.
            </Text>
          </View>
          <BusinessContact business={business} />
          <ClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope="Factory-Grade Cabinet Refinishing" total={data.totalInvestment} />
          <ProcessSteps title={`Section III — The ${business.name} 4-Phase Cabinet Process`} steps={CABINET_STEPS} />
        </View>
        <DocFooter business={business} pageNum={1} totalPages={totalPages} />
      </Page>
      <Page size="LETTER" style={s.page}>
        <View style={s.body}>
          <MaterialsSection items={data.lineItems ?? []} sectionTitle="Section IV — Coating Specifications" coatingNote={coatingNote} />
          <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
          <WarrantySection items={warrantyItems} />
          <SignatureBlock />
        </View>
        <DocFooter business={business} pageNum={2} totalPages={totalPages} />
      </Page>
      {data.showInsurancePage && <InsurancePage business={business} />}
    </Document>
  )
}

function CustomPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const totalPages = data.showInsurancePage ? 3 : 2
  const warrantyItems = [
    { title: 'White Glove Cleanup',
      body: '30–45 minutes of dedicated site cleanup at the end of each work day.' },
    { title: `${data.warrantyYears ?? business.warrantyYears ?? '5'}-Year Workmanship Warranty`,
      body: `All workmanship defects remediated at no cost within ${data.warrantyYears ?? business.warrantyYears ?? '5'} years of project completion.` },
    { title: 'Insurance Coverage',
      body: `${business.name} carries ${business.insuranceLimit ?? '$2,000,000'} General Liability Insurance.${business.insurancePolicy ? ' Policy No. ' + business.insurancePolicy + '.' : ''} COI available upon request.` },
  ]
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <DocHeader business={business} projectName={data.projectName} proposalType="PROFESSIONAL SERVICE PROPOSAL" issueDate={data.issueDate} validUntil={data.validUntil} />
        <View style={s.body}>
          <View style={s.confBox}>
            <Text style={s.confText}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: TEXT }}>CONFIDENTIAL: </Text>
              This proposal and all associated pricing, processes, and materials are proprietary to {business.name}.
            </Text>
          </View>
          <BusinessContact business={business} />
          <ClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope={data.projectScope} total={data.totalInvestment} />
          {/* Scope of Work */}
          <View style={{ marginTop: 12 }}>
            <SectionHeader title="Section III — Scope of Work" />
            <Text style={{ fontSize: 9, color: TEXT_BODY, lineHeight: 1.7 }}>
              {data.scopeOfWork || '—'}
            </Text>
          </View>
        </View>
        <DocFooter business={business} pageNum={1} totalPages={totalPages} />
      </Page>
      <Page size="LETTER" style={s.page}>
        <View style={s.body}>
          <MaterialsSection items={data.lineItems ?? []} sectionTitle="Section IV — Materials & Specifications" />
          <PaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
          <WarrantySection items={warrantyItems} />
          <SignatureBlock />
        </View>
        <DocFooter business={business} pageNum={2} totalPages={totalPages} />
      </Page>
      {data.showInsurancePage && <InsurancePage business={business} />}
    </Document>
  )
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
export async function downloadProposalPDF(
  template: ProposalTemplate,
  data: any,
  fileName: string,
  businessInfo?: BusinessInfo,
) {
  const business: BusinessInfo = businessInfo ?? { name: 'Business' }

  // Pre-fetch logo as base64 data URI so @react-pdf/renderer doesn't hit CORS
  if (business.logoUrl && !business.logoUrl.startsWith('data:')) {
    const dataUrl = await fetchLogoDataUrl(business.logoUrl)
    business.logoUrl = dataUrl ?? undefined
  }

  let doc: React.ReactElement
  switch (template) {
    case 'interior': doc = <InteriorPDF data={data} business={business} />; break
    case 'exterior': doc = <ExteriorPDF data={data} business={business} />; break
    case 'cabinet':  doc = <CabinetPDF  data={data} business={business} />; break
    default:         doc = <CustomPDF   data={data} business={business} />
  }

  const blob = await pdf(doc).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
