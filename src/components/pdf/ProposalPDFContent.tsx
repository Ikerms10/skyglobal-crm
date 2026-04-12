'use client'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer'

export type ProposalServiceType = 'interior' | 'exterior' | 'cabinets'

const GOLD = '#c9891a'
const DARK = '#1d1c17'
const TEXT = '#1a1a1a'
const MUTED = '#555555'
const LIGHT = '#888888'
const BORDER = '#d4d4d4'
const ROW_ALT = '#f9f9f9'
const PAGE_PAD = 52

const s = StyleSheet.create({
  page: { padding: PAGE_PAD, fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#fff', lineHeight: 1.45 },
  footer: { position: 'absolute', bottom: 26, left: PAGE_PAD, right: PAGE_PAD, textAlign: 'center', fontSize: 7.5, color: '#aaa', borderTop: '0.5pt solid #e8e8e8', paddingTop: 6 },

  // ── Cover / Header ──────────────────────────────────────────────
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 30 },
  logoImg: { width: 56, height: 56, objectFit: 'contain' },
  logoFallback: { width: 56, height: 56, backgroundColor: DARK, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontSize: 18, fontWeight: 'bold', color: GOLD },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 22, fontWeight: 'bold', color: DARK, lineHeight: 1.15 },
  companyLLC: { fontSize: 14, fontWeight: 'bold', color: DARK, lineHeight: 1 },

  docTitleBlock: { marginBottom: 26 },
  docTitle: { fontSize: 20, fontWeight: 'bold', color: TEXT, lineHeight: 1.2, marginBottom: 12, textTransform: 'uppercase' },
  metaLine: { marginBottom: 8 },
  metaLabel: { fontSize: 10, fontWeight: 'bold', color: TEXT },
  confidential: { fontSize: 8.5, fontStyle: 'italic', color: MUTED, lineHeight: 1.6, marginTop: 14, maxWidth: 420 },

  // ── Section Heading ─────────────────────────────────────────────
  sectionHeading: { fontSize: 11, fontWeight: 'bold', color: GOLD, borderBottom: `1.5pt solid ${GOLD}`, paddingBottom: 3, marginTop: 18, marginBottom: 8 },

  // ── Summary Table ────────────────────────────────────────────────
  summaryTable: { borderTop: '1pt solid ' + BORDER, borderLeft: '1pt solid ' + BORDER, borderRight: '1pt solid ' + BORDER },
  summaryRow: { flexDirection: 'row', borderBottom: '1pt solid ' + BORDER },
  summaryCell: { flex: 1, padding: '7 10', fontSize: 10 },
  summaryCellLabel: { flex: 1, padding: '7 10', fontSize: 10, color: MUTED },

  // ── Process Steps ────────────────────────────────────────────────
  stepTitle: { fontSize: 10, fontWeight: 'bold', color: TEXT, marginTop: 12, marginBottom: 4 },
  bullet: { fontSize: 9, color: MUTED, marginBottom: 2.5, paddingLeft: 12, lineHeight: 1.5 },
  introText: { fontSize: 9.5, color: MUTED, marginBottom: 10, lineHeight: 1.55 },

  // ── Coating/Material Table ───────────────────────────────────────
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#f0f0f0', padding: '6 8', borderBottom: '1pt solid ' + BORDER },
  tableRow: { flexDirection: 'row', padding: '7 8', borderBottom: '0.5pt solid ' + BORDER },
  tableRowAlt: { flexDirection: 'row', padding: '7 8', borderBottom: '0.5pt solid ' + BORDER, backgroundColor: ROW_ALT },
  thCell: { fontSize: 8.5, fontWeight: 'bold', color: MUTED },
  tdCell: { fontSize: 9.5, color: TEXT },
  col1_3: { flex: 1.5 },
  col2_3: { flex: 1, textAlign: 'center' },
  col3_3: { flex: 2 },
  col1_4: { flex: 2.5 },
  col2_4: { flex: 1, textAlign: 'center' },
  col3_4: { flex: 1, textAlign: 'right' },
  col4_4: { flex: 1, textAlign: 'right' },
  specNote: { fontSize: 9, fontWeight: 'bold', color: TEXT, marginTop: 8 },

  // ── Payment Schedule ─────────────────────────────────────────────
  paymentIntro: { fontSize: 9.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 },
  paymentBullet: { fontSize: 9.5, color: TEXT, marginBottom: 5, paddingLeft: 12, lineHeight: 1.55 },
  paymentBold: { fontWeight: 'bold' },
  transparencyBox: { marginTop: 10, padding: '8 10', backgroundColor: '#fffbf0', border: '1pt solid #e6c96a' },
  transparencyText: { fontSize: 8.5, fontStyle: 'italic', fontWeight: 'bold', color: '#7a5a00', lineHeight: 1.55 },

  // ── Warranty / Provisions ────────────────────────────────────────
  provisionRow: { flexDirection: 'row', marginBottom: 6, gap: 6 },
  provisionNum: { fontSize: 9.5, fontWeight: 'bold', color: TEXT, width: 16 },
  provisionText: { fontSize: 9, color: MUTED, flex: 1, lineHeight: 1.55 },

  // ── Signature ────────────────────────────────────────────────────
  signatureRow: { flexDirection: 'row', gap: 48, marginTop: 30 },
  signLine: { flex: 1, borderTop: '1pt solid ' + TEXT, paddingTop: 4, fontSize: 9, color: MUTED },

  // ── Totals (interior materials) ──────────────────────────────────
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: '5 8', borderTop: '1pt solid ' + GOLD, marginTop: 2 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: '6 10', backgroundColor: DARK, borderRadius: 3, marginTop: 2 },
  totalLabel: { fontSize: 10, fontWeight: 'bold', width: 90, textAlign: 'right', marginRight: 8 },
  totalValue: { fontSize: 10, fontWeight: 'bold', width: 80, textAlign: 'right', color: GOLD },
  grandTotalLabel: { fontSize: 11, fontWeight: 'bold', width: 90, textAlign: 'right', marginRight: 8, color: '#fff' },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', width: 80, textAlign: 'right', color: GOLD },
})

// ─── Data ────────────────────────────────────────────────────────────────────

const SERVICE_TITLES: Record<ProposalServiceType, string> = {
  interior: 'PROFESSIONAL SERVICE PROPOSAL',
  exterior: 'EXTERIOR PROTECTION & FINISHING PROPOSAL',
  cabinets: 'CABINET REFINISHING & RESTORATION PROPOSAL',
}

const PROCESS: Record<ProposalServiceType, { heading: string; intro: string; steps: { title: string; bullets: string[] }[] }> = {
  interior: {
    heading: 'THE SKYGLOBAL INTERIOR PROCESS',
    intro: 'Professional application of our systematic interior methodology to ensure a factory-grade finish and long-term durability.',
    steps: [
      { title: 'Step 1: Preparation & Protection', bullets: [
        'Environment Shielding: Comprehensive masking of floors (with drop cloths/plastic), furniture, and hardware.',
        'Surface Cleaning: Removal of dust, oils, and contaminants to ensure a sterile substrate for maximum adhesion.',
      ]},
      { title: 'Step 2: Remediation & Priming', bullets: [
        'Drywall Restoration: Patching of nail holes, stress cracks, and minor dents. Sanding of all repaired areas to a smooth, level finish.',
        'Priming: Application of high-build industrial primers to bare drywall or repaired areas, ensuring a uniform base for the finish coats.',
      ]},
      { title: 'Step 3: Premium Application', bullets: [
        'Execution: Precise application of two (2) coats of premium Sherwin-Williams coatings via spray, brush, or roller, depending on the surface texture.',
        'Detailing: Clean, sharp lines on all transitions (ceilings, trim, and baseboards).',
      ]},
      { title: 'Step 4: Site Restoration & Quality Control', bullets: [
        'Cleanup: Full removal of all masking and debris; the property is left immaculate.',
        'Final Walkthrough: A detailed inspection with the client, immediate touch-ups if required, and labeled surplus paint left on-site for future maintenance.',
      ]},
    ],
  },
  exterior: {
    heading: 'THE SKYGLOBAL 4-STEP EXTERIOR PROCESS',
    intro: "Florida's heat and humidity demand a proven system. We apply a rigorous 4-step sequence to ensure your finish is built to last.",
    steps: [
      { title: 'Step 01: Power Washing (The Foundation of Adhesion)', bullets: [
        'Full exterior pressure wash to remove dirt, algae, and surface chalking.',
        'Soft Chemical Wash: Applied to delicate surfaces (stucco, wood trim, soffits) to clean without substrate damage.',
        'Surfaces are allowed to fully dry before any preparation or paint work begins.',
      ]},
      { title: 'Step 02: Scraping, Priming & Surface Stabilization', bullets: [
        'Level 2 Prep: Hand-scraping of all loose or failing paint to expose a stable substrate.',
        'Remediation: Cracks and gaps are filled with exterior-grade sealants to restore surface integrity.',
        'Priming: All bare or repaired areas receive professional-grade primer to ensure maximum adhesion.',
      ]},
      { title: 'Step 03: Expert Paint Application', bullets: [
        'Methodology: Application via airless sprayers for uniform coverage, with brush-and-roll detailing for trim and precise edges.',
        'Full Protection: Complete masking of all non-painted surfaces, including landscaping, windows, lighting, and hardware.',
        'Finishing: Application of designated Sherwin-Williams premium coatings in HOA-approved colors.',
      ]},
      { title: 'Step 04: Final Cleanup & Quality Assurance', bullets: [
        'Complete removal of masking, tarps, and debris.',
        'Cleaning of plant beds and adjacent areas to remove paint chips or overspray.',
        'Final Walkthrough: On-site inspection with the client, immediate touch-ups if needed, and delivery of labeled surplus paint for future maintenance.',
      ]},
    ],
  },
  cabinets: {
    heading: 'THE SKYGLOBAL 10-PHASE REFINISHING PROCESS',
    intro: "We don't just paint cabinets; we refinish them using a systematic multi-phase process to ensure a smooth, hard, factory-quality coating.",
    steps: [
      { title: 'Phase 1: Teardown & Precision Labeling', bullets: [
        'Careful removal of all doors, drawer fronts, and hardware.',
        'Proprietary labeling system ensures every component returns to its exact original position.',
        'Transport of components to our professional spray shop for controlled finishing.',
      ]},
      { title: 'Phase 2: Protection & Surface Prep', bullets: [
        'Complete Home Protection: Masking of floors, backsplashes, countertops, and ceilings.',
        'Chemical Degreasing: Removal of cooking oils and grime — essential for long-term adhesion.',
        'Dustless Sanding: 180/220 grit mechanical sanding using the EKASANDER system to create a perfect bond profile.',
      ]},
      { title: 'Phase 3: Industrial Primer System', bullets: [
        '2-Coat Bonding Primer: Application of Renner 1K 643/648 or equivalent industrial bonding primer.',
        'Tannin Blocking: Use of oil-based stain blockers where necessary to prevent bleed-through.',
        'Inter-Coat Sanding: 320 grit sanding between primer coats for a glass-smooth foundation.',
      ]},
      { title: 'Phase 4: Professional Topcoat & Reinstallation', bullets: [
        'Fine-Finish Spraying: Two coats of premium topcoat applied via HVLP fine-finish tips for a factory-level texture.',
        'White-Glove Delivery: All components are wrapped in protective film for transport.',
        'Reinstallation: Precise mounting and alignment of all doors, drawers, and hardware.',
      ]},
    ],
  },
}

const MATERIALS: Record<ProposalServiceType, { heading: string; subtitle: string; rows: { col1: string; col3: string }[]; notes: string[] }> = {
  interior: {
    heading: 'MATERIAL SPECIFICATIONS',
    subtitle: 'We use exclusively Sherwin-Williams products. Our partnership discounts are passed directly to you with Zero Material Markup.',
    rows: [], // uses line items
    notes: [],
  },
  exterior: {
    heading: 'MATERIAL SPECIFICATIONS',
    subtitle: 'We use Sherwin-Williams systems engineered for the Florida climate.',
    rows: [
      { col1: 'Tier 1: Latitude®', col3: 'ClimateFlex Technology™ for extreme temperature stability.' },
      { col1: 'Tier 2: Duration®', col3: 'Advanced resin technology for superior adhesion and mold resistance.' },
      { col1: 'Tier 3: Emerald®', col3: 'Self-cleaning Rain Refresh technology and maximum UV protection.' },
    ],
    notes: ['Sealant: SherMax™ Urethanized Elastomeric Sealant (Included)'],
  },
  cabinets: {
    heading: 'COATING SPECIFICATIONS',
    subtitle: 'Select the level of protection engineered for your kitchen environment:',
    rows: [
      { col1: 'Signature: Emerald® Urethane', col3: 'Hard, non-yellowing urethane finish for high-durability daily use.' },
      { col1: 'Elite: Gallery Series™', col3: 'KCMA-Compliant. Professional-grade waterborne topcoat with maximum chemical & moisture resistance.' },
    ],
    notes: [
      'Primer System: Renner Wood Coatings Industrial Bonding Primer (Included)',
      'Sanding System: EKASANDER Dustless Orbital System (Included)',
    ],
  },
}

const WARRANTY: Record<ProposalServiceType, { heading: string; provisions: string[] }> = {
  interior: {
    heading: '5-YEAR WORKMANSHIP WARRANTY & COMPLIANCE',
    provisions: [
      'Coverage: Covers peeling, blistering, or chipping resulting from improper surface preparation or application.',
      'Exclusions: Does not cover structural shifts (settling cracks), moisture intrusion (leaks), or mechanical damage.',
      'Activation: Warranty is valid only upon receipt of the final balance in full.',
      'Insurance & Compliance: Carrier: Coterie Insurance ($2 Million Liability) · Policy Number: CEG-00312198-00.',
    ],
  },
  exterior: {
    heading: 'CONTRACTUAL PROVISIONS & WARRANTY',
    provisions: [
      'Existing Adhesion: Surfaces with existing peeling paint are subjected to our Level 2 Prep. Note that ridges or texture variations from previous damage may remain visible.',
      '5-Year Workmanship Warranty: Covers peeling, blistering, or chipping resulting from improper application. Does not cover structural shifts or environmental abuse.',
      'Insurance: SkyGlobal maintains $2 Million in Liability Insurance under Policy CEG-00312198-00.',
    ],
  },
  cabinets: {
    heading: 'CONTRACTUAL PROVISIONS & WARRANTY',
    provisions: [
      'White Glove Cleanup: We dedicate 30–45 minutes daily to tidying your space throughout the project.',
      '5-Year Workmanship Warranty: Covers peeling or blistering resulting from improper preparation or application.',
      'Insurance: SkyGlobal carries $2 Million in Liability Insurance (Policy CEG-00312198-00).',
      'Maintenance: Do not use abrasive chemicals on newly finished surfaces for 30 days while the coating fully cures.',
    ],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItem { description: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number | null }

export interface ProposalProps {
  serviceType: ProposalServiceType
  project: { id: string; title: string; address?: string | null; contract_value?: number | null }
  customer: { name: string; phone?: string | null; email?: string | null }
  lineItems: LineItem[]
  selectedCoating?: string
  selectedSheen?: string
  logoUrl?: string
}

// ─── Document ────────────────────────────────────────────────────────────────

function ProposalDocument({ serviceType, project, customer, lineItems, selectedCoating, selectedSheen, logoUrl }: ProposalProps) {
  const today = new Date()
  const issuedDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const validUntil = addDays(today, 30)
  const docNum = project.id.slice(-8).toUpperCase()
  const total = project.contract_value ?? lineItems.reduce((s, li) => s + (li.total ?? (li.quantity ?? 1) * (li.unit_price ?? 0)), 0)
  const deposit = total * 0.3
  const progress = total * 0.4
  const final = total * 0.3
  const process = PROCESS[serviceType]
  const materials = MATERIALS[serviceType]
  const warranty = WARRANTY[serviceType]
  const footerText = `SkyGlobal Renovations LLC  ·  352-782-2460  ·  skyglobalsvcs@gmail.com  ·  skyglobalsvcs.com`

  return (
    <Document>
      {/* ── PAGE 1: Cover + Contact + Client Summary ── */}
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View>
            {logoUrl ? (
              <Image src={logoUrl} style={s.logoImg} />
            ) : (
              <View style={s.logoFallback}>
                <Text style={s.logoFallbackText}>SG</Text>
              </View>
            )}
          </View>
          <View style={s.companyBlock}>
            <Text style={s.companyName}>SkyGlobal</Text>
            <Text style={s.companyLLC}>Renovations LLC</Text>
          </View>
        </View>

        {/* Document title */}
        <View style={s.docTitleBlock}>
          <Text style={s.docTitle}>{project.title || docNum} | {SERVICE_TITLES[serviceType]}</Text>
          <View style={s.metaLine}><Text style={s.metaLabel}>SkyGlobal Renovations LLC</Text></View>
          <View style={s.metaLine}><Text style={s.metaLabel}>Date of Issuance: <Text style={{ fontWeight: 'normal', color: MUTED }}>{issuedDate}</Text></Text></View>
          <View style={s.metaLine}><Text style={s.metaLabel}>Proposal Valid Until: <Text style={{ fontWeight: 'normal', color: MUTED }}>{validUntil}</Text></Text></View>
          <Text style={s.confidential}>
            Confidentiality Notice: This document contains proprietary pricing and process information intended solely for the recipient. Disclosure, copying, or distribution of this information without written consent from SkyGlobal Renovations LLC is strictly prohibited.
          </Text>
        </View>

        {/* I. Business Contact */}
        <Text style={s.sectionHeading}>I. BUSINESS CONTACT INFORMATION</Text>
        <Text style={[s.bullet, { marginBottom: 4 }]}>• Phone: 352-782-2460 | 470-469-9961</Text>
        <Text style={[s.bullet, { marginBottom: 4 }]}>• Email: skyglobalsvcs@gmail.com</Text>
        <Text style={[s.bullet, { marginBottom: 4 }]}>• Web: skyglobalsvcs.com</Text>
        <Text style={[s.bullet, { marginBottom: 4 }]}>• Social: @skyglobalp (Instagram &amp; Facebook)</Text>
        <Text style={[s.bullet, { marginBottom: 4 }]}>• Credentials: Thumbtack Profile (+75 Reviews) | BBB Accredited | Sherwin-Williams PRO+</Text>

        {/* II. Client & Project Summary */}
        <Text style={s.sectionHeading}>II. CLIENT &amp; PROJECT SUMMARY</Text>
        <View style={s.summaryTable}>
          <View style={s.summaryRow}>
            <Text style={s.summaryCellLabel}>Client Name</Text>
            <Text style={s.summaryCell}>{customer.name}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryCellLabel}>Contact Info</Text>
            <Text style={s.summaryCell}>{customer.phone ?? customer.email ?? '—'}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryCellLabel}>Project Address</Text>
            <Text style={s.summaryCell}>{project.address ?? '—'}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryCellLabel}>Project Type</Text>
            <Text style={s.summaryCell}>
              {serviceType === 'interior' ? 'Interior Professional Service Proposal' : serviceType === 'exterior' ? 'Exterior Protection & Level 2 Prep' : 'Factory-Grade Cabinet Refinishing'}
            </Text>
          </View>
          <View style={[s.summaryRow, { borderBottom: 'none' }]}>
            <Text style={s.summaryCellLabel}>Total Investment</Text>
            <Text style={[s.summaryCell, { fontWeight: 'bold', color: GOLD }]}>{fmt(total)}</Text>
          </View>
        </View>

        <Text style={s.footer}>{footerText}</Text>
      </Page>

      {/* ── PAGE 2: Process ── */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.sectionHeading}>III. {process.heading}</Text>
        <Text style={s.introText}>{process.intro}</Text>

        {process.steps.map((step, i) => (
          <View key={i} wrap={false}>
            <Text style={s.stepTitle}>{step.title}</Text>
            {step.bullets.map((b, j) => (
              <Text key={j} style={s.bullet}>• {b}</Text>
            ))}
          </View>
        ))}

        <Text style={s.footer}>{footerText}</Text>
      </Page>

      {/* ── PAGE 3: Materials + Payment ── */}
      <Page size="LETTER" style={s.page}>

        {/* IV. Materials */}
        <Text style={s.sectionHeading}>IV. {materials.heading}</Text>
        <Text style={s.introText}>{materials.subtitle}</Text>

        {serviceType === 'interior' ? (
          /* Interior: line items table */
          <View>
            <View style={s.tableHeaderRow}>
              <Text style={[s.thCell, s.col1_4]}>Material / Description</Text>
              <Text style={[s.thCell, s.col2_4]}>Qty</Text>
              <Text style={[s.thCell, s.col3_4]}>Unit Price</Text>
              <Text style={[s.thCell, s.col4_4]}>Total</Text>
            </View>
            {lineItems.length > 0 ? lineItems.map((li, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tdCell, s.col1_4]}>{li.description}</Text>
                <Text style={[s.tdCell, s.col2_4, { textAlign: 'center' }]}>{li.quantity ?? 1}</Text>
                <Text style={[s.tdCell, s.col3_4, { textAlign: 'right' }]}>{fmt(li.unit_price)}</Text>
                <Text style={[s.tdCell, s.col4_4, { textAlign: 'right' }]}>{fmt(li.total ?? (li.quantity ?? 1) * (li.unit_price ?? 0))}</Text>
              </View>
            )) : (
              <View style={s.tableRow}>
                <Text style={[s.tdCell, { color: LIGHT, fontStyle: 'italic' }]}>Full interior repaint — walls, trim &amp; baseboards</Text>
                <Text style={[s.tdCell, s.col2_4, { textAlign: 'center' }]}>—</Text>
                <Text style={[s.tdCell, s.col3_4, { textAlign: 'right' }]}>—</Text>
                <Text style={[s.tdCell, s.col4_4, { textAlign: 'right' }]}>{fmt(total)}</Text>
              </View>
            )}
            <View style={s.tableRow}>
              <Text style={[s.tdCell, s.col1_4, { color: MUTED, fontStyle: 'italic' }]}>Prep Materials (Tape, Plastic, Spackle)</Text>
              <Text style={[s.tdCell, s.col2_4, { textAlign: 'center' }]}>N/A</Text>
              <Text style={[s.tdCell, s.col3_4, { textAlign: 'right', color: MUTED }]}>Included</Text>
              <Text style={[s.tdCell, s.col4_4, { textAlign: 'right', color: MUTED }]}>Included</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalLabel}>Total:</Text>
              <Text style={s.totalValue}>{fmt(total)}</Text>
            </View>
            <View style={s.grandTotalRow}>
              <Text style={s.grandTotalLabel}>TOTAL INVESTMENT:</Text>
              <Text style={s.grandTotalValue}>{fmt(total)}</Text>
            </View>
          </View>
        ) : (
          /* Exterior / Cabinets: coating tier selection table */
          <View>
            <View style={s.tableHeaderRow}>
              <Text style={[s.thCell, s.col1_3]}>Coating System</Text>
              <Text style={[s.thCell, s.col2_3]}>Selection</Text>
              <Text style={[s.thCell, s.col3_3]}>Benefits</Text>
            </View>
            {materials.rows.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={[s.tdCell, s.col1_3]}>{row.col1}</Text>
                <Text style={[s.tdCell, s.col2_3, { textAlign: 'center' }]}>
                  {selectedCoating === row.col1 ? '✓' : '[ ]'}
                </Text>
                <Text style={[s.tdCell, s.col3_3]}>{row.col3}</Text>
              </View>
            ))}
            {serviceType === 'exterior' && selectedSheen && (
              <Text style={s.specNote}>Selected Sheen: {selectedSheen}</Text>
            )}
            {materials.notes.map((note, i) => (
              <Text key={i} style={s.specNote}>{note}</Text>
            ))}
          </View>
        )}

        {/* V. Investment & Payment Schedule */}
        <Text style={s.sectionHeading}>V. INVESTMENT &amp; PAYMENT SCHEDULE</Text>
        <Text style={s.paymentIntro}>To secure resources and maintain the project timeline, the following schedule is strictly enforced:</Text>

        <Text style={s.paymentBullet}>
          • <Text style={s.paymentBold}>Initial Deposit (30%): {fmt(deposit)}</Text> – Due 48 hours prior to the scheduled start date{serviceType === 'cabinets' ? ' to secure the production slot' : ' to lock in the crew'}.
        </Text>
        <Text style={s.paymentBullet}>
          • <Text style={s.paymentBold}>Progress Payment (40%): {fmt(progress)}</Text> – Due immediately upon {serviceType === 'cabinets' ? 'completion of cabinet box painting (on-site phase)' : '50% completion of the defined scope'}.
        </Text>
        <Text style={s.paymentBullet}>
          • <Text style={s.paymentBold}>Final Balance (30%): {fmt(final)}</Text> – Due upon project completion and successful final walkthrough{serviceType === 'cabinets' ? ' and client approval' : ''}.
        </Text>

        <View style={s.transparencyBox}>
          <Text style={s.transparencyText}>
            Transparency Notice: Quoted prices reflect a cash/check/transfer discount. Payments made via credit or debit card will incur a 3.9% processing fee.
          </Text>
        </View>

        <Text style={s.footer}>{footerText}</Text>
      </Page>

      {/* ── PAGE 4: Warranty + Signature ── */}
      <Page size="LETTER" style={s.page}>
        <Text style={s.sectionHeading}>VI. {warranty.heading}</Text>

        {warranty.provisions.map((p, i) => (
          <View key={i} style={s.provisionRow}>
            <Text style={s.provisionNum}>{i + 1}.</Text>
            <Text style={s.provisionText}>{p}</Text>
          </View>
        ))}

        <View style={s.signatureRow}>
          <View style={s.signLine}>
            <Text>Acceptance Signature</Text>
          </View>
          <View style={s.signLine}>
            <Text>Date</Text>
          </View>
          <View style={s.signLine}>
            <Text>SkyGlobal Representative</Text>
          </View>
        </View>

        <Text style={s.footer}>{footerText}</Text>
      </Page>
    </Document>
  )
}

// ─── Download Button ──────────────────────────────────────────────────────────

export function DownloadProposalButton(props: ProposalProps) {
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined
  const serviceLabel = props.serviceType === 'interior' ? 'Interior' : props.serviceType === 'exterior' ? 'Exterior' : 'Cabinets'
  const filename = `SkyGlobal-Proposal-${serviceLabel}-${props.customer.name.replace(/\s+/g, '-')}.pdf`

  return (
    <PDFDownloadLink
      document={<ProposalDocument {...props} logoUrl={logoUrl} />}
      fileName={filename}
    >
      {({ loading }) => (
        <button
          className="inline-flex items-center gap-2 bg-[#252419] border border-[#2e2d26] text-[#efeae2] hover:bg-[#2e2d26] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? '⏳ Generating...' : '📋 Download Proposal'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

export default ProposalDocument
