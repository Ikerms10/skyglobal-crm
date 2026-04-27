'use client'
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer'
import { LineItem } from './EditableTable'
import { ProposalTemplate } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', lineHeight: 1.5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' },
  companySubtitle: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  titleBar: { backgroundColor: '#1d1c17', color: '#e6ab35', padding: '10 16', borderRadius: 4, marginBottom: 12, textAlign: 'center', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 },
  confBox: { backgroundColor: '#f9f9f7', border: '1 solid #e5e7eb', borderRadius: 3, padding: '6 10', marginBottom: 10, fontSize: 8, color: '#6b7280', fontStyle: 'italic' },
  sectionHeader: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#3583b3', borderBottom: '1.5 solid #3583b3', paddingBottom: 3, marginBottom: 8, marginTop: 16, letterSpacing: 1 },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb' },
  tableLabel: { width: '35%', padding: '5 8', fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#374151', backgroundColor: '#f9f9f7' },
  tableValue: { width: '65%', padding: '5 8', fontSize: 9 },
  lineItemHeader: { flexDirection: 'row', backgroundColor: '#3583b3' },
  lineItemHeaderCell: { padding: '4 6', color: '#fff', fontSize: 8, fontFamily: 'Helvetica-Bold' },
  lineItemRow: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb' },
  lineItemCell: { padding: '4 6', fontSize: 8 },
  stepTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3, marginTop: 8 },
  bullet: { fontSize: 8, color: '#374151', marginLeft: 10, marginBottom: 2 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, fontSize: 9 },
  warrantyItem: { marginBottom: 6, fontSize: 9 },
  sigBox: { flexDirection: 'row', gap: 40, marginTop: 20, paddingTop: 12, borderTop: '1 solid #e5e7eb' },
  sigLine: { borderBottom: '1 solid #1a1a1a', minWidth: 160, paddingBottom: 2, marginBottom: 3 },
  sigLabel: { fontSize: 8, color: '#6b7280' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af', borderTop: '1 solid #e5e7eb', paddingTop: 4 },
  insBox: { border: '2 solid #1d1c17', borderRadius: 4, padding: 16, fontSize: 9, lineHeight: 1.8 },
  insGrid: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  insNote: { backgroundColor: '#f9f9f7', borderRadius: 3, padding: '6 10', fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginTop: 8 },
  radio: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8, padding: '6 8', borderRadius: 3 },
  radioLabel: { fontSize: 9, fontFamily: 'Helvetica-Bold' },
  radioDesc: { fontSize: 8, color: '#6b7280', marginTop: 1 },
})

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface BusinessInfo {
  name: string
  phone?: string | null
  email?: string | null
  website?: string | null
}

function PDFHeader({ projectName, proposalType, issueDate, validUntil, business }: any) {
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={{ fontSize: 8, color: '#9a9585' }}>{business.name}</Text>
        </View>
        <View>
          <Text style={styles.companyName}>{business.name}</Text>
          <Text style={styles.companySubtitle}>Professional Services</Text>
        </View>
      </View>
      <View style={styles.titleBar}>
        <Text>{(projectName || 'PROPOSAL').toUpperCase()} | {proposalType}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{business.name}</Text>
        <View style={{ alignItems: 'flex-end' }}>
          <Text>Date of Issuance: {issueDate || '—'}</Text>
          <Text>Proposal Valid Until: {validUntil || '—'}</Text>
        </View>
      </View>
      <View style={styles.confBox}>
        <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>CONFIDENTIAL:</Text> This proposal and all associated pricing, processes, and materials are proprietary to {business.name}.</Text>
      </View>
    </>
  )
}

function PDFBusinessContact({ business }: { business: BusinessInfo }) {
  return (
    <>
      <Text style={styles.sectionHeader}>Section I — Business Contact</Text>
      <View style={{ flexDirection: 'row', gap: 20, fontSize: 9 }}>
        <View>
          {business.phone && <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Phone:</Text> {business.phone}</Text>}
          {business.email && <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Email:</Text> {business.email}</Text>}
          {business.website && <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Web:</Text> {business.website}</Text>}
        </View>
      </View>
    </>
  )
}

function PDFClientSummary({ clientName, clientContact, clientAddress, projectScope, total }: any) {
  const rows = [
    ['Client Name', clientName || '—'],
    ['Contact Info', clientContact || '—'],
    ['Project Address', clientAddress || '—'],
    ['Project Scope / Type', projectScope || '—'],
    ['Total Investment', total != null ? `$${fmt(total)}` : '—'],
  ]
  return (
    <>
      <Text style={styles.sectionHeader}>Section II — Client & Project Summary</Text>
      {rows.map(([label, val], i) => (
        <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#f9f9f7' : '#fff' }]}>
          <Text style={styles.tableLabel}>{label}</Text>
          <Text style={styles.tableValue}>{val}</Text>
        </View>
      ))}
    </>
  )
}

function PDFLineItems({ items }: { items: LineItem[] }) {
  return (
    <>
      <View style={styles.lineItemHeader}>
        <Text style={[styles.lineItemHeaderCell, { width: '50%' }]}>Description</Text>
        <Text style={[styles.lineItemHeaderCell, { width: '15%', textAlign: 'center' }]}>Qty</Text>
        <Text style={[styles.lineItemHeaderCell, { width: '20%', textAlign: 'right' }]}>Unit Price</Text>
        <Text style={[styles.lineItemHeaderCell, { width: '15%', textAlign: 'right' }]}>Total</Text>
      </View>
      {items.map((item, i) => (
        <View key={item.id} style={[styles.lineItemRow, { backgroundColor: i % 2 === 0 ? '#f9f9f7' : '#fff' }]}>
          <Text style={[styles.lineItemCell, { width: '50%' }]}>{item.description || '—'}</Text>
          <Text style={[styles.lineItemCell, { width: '15%', textAlign: 'center' }]}>{item.quantity ?? '—'}</Text>
          <Text style={[styles.lineItemCell, { width: '20%', textAlign: 'right' }]}>{item.unit_price != null ? `$${fmt(item.unit_price)}` : '—'}</Text>
          <Text style={[styles.lineItemCell, { width: '15%', textAlign: 'right' }]}>
            {item.total != null ? `$${fmt(item.total)}` : item.description?.toLowerCase().includes('included') ? 'Incl.' : '—'}
          </Text>
        </View>
      ))}
    </>
  )
}

function PDFPaymentSchedule({ total, depositPct, progressPct, finalPct, business }: any) {
  const d = total ? total * (depositPct / 100) : null
  const p = total ? total * (progressPct / 100) : null
  const f2 = total ? total * (finalPct / 100) : null
  return (
    <>
      <View style={styles.payRow}>
        <Text>Initial Deposit ({depositPct}%): Due 48 hours prior to start</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{d != null ? `$${fmt(d)}` : '—'}</Text>
      </View>
      <View style={styles.payRow}>
        <Text>Progress Payment ({progressPct}%): Due upon 50% completion</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{p != null ? `$${fmt(p)}` : '—'}</Text>
      </View>
      <View style={styles.payRow}>
        <Text>Final Balance ({finalPct}%): Due upon project completion</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold' }}>{f2 != null ? `$${fmt(f2)}` : '—'}</Text>
      </View>
      <Text style={{ fontSize: 8, color: '#6b7280', fontStyle: 'italic', marginTop: 6 }}>
        {business?.name ?? 'We'} operate with full financial transparency. All material costs are invoiced at direct contractor pricing with zero markup.
      </Text>
    </>
  )
}

function PDFWarranty(items: [string, string][]) {
  return items.map(([title, body], i) => (
    <View key={i} style={styles.warrantyItem}>
      <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>{i + 1}. {title}: </Text>{body}</Text>
    </View>
  ))
}

function PDFSignature() {
  return (
    <View style={styles.sigBox}>
      <View>
        <View style={styles.sigLine}><Text> </Text></View>
        <Text style={styles.sigLabel}>Client Acceptance Signature</Text>
      </View>
      <View>
        <View style={[styles.sigLine, { minWidth: 100 }]}><Text> </Text></View>
        <Text style={styles.sigLabel}>Date</Text>
      </View>
    </View>
  )
}

function PDFInsurance({ business }: { business: BusinessInfo }) {
  return (
    <>
      <Text style={styles.sectionHeader}>Certificate of Insurance</Text>
      <View style={styles.insBox}>
        <View style={styles.insGrid}>
          <View>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Insured:</Text> {business.name}</Text>
            <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Coverage:</Text> General Liability</Text>
          </View>
          <View>
            {business.phone && <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Phone:</Text> {business.phone}</Text>}
            {business.email && <Text><Text style={{ fontFamily: 'Helvetica-Bold' }}>Email:</Text> {business.email}</Text>}
          </View>
        </View>
        <View style={styles.insNote}>
          <Text>Full Certificate of Insurance (COI) available upon request.</Text>
        </View>
      </View>
    </>
  )
}

function PDFFooter({ page, total, business }: { page: number; total: number; business: BusinessInfo }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{business.name} · Confidential</Text>
      <Text>Page {page} of {total}</Text>
    </View>
  )
}

// ─── INTERIOR PDF ────────────────────────────────────────────────────────────

function InteriorPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const steps = [
    { step: 'Step 1: Preparation & Protection', bullets: ['Environment Shielding: All furniture, flooring, fixtures, and hardware fully masked and protected.', 'Surface Cleaning: All paintable surfaces wiped clean prior to application.'] },
    { step: 'Step 2: Remediation & Priming', bullets: ['Drywall Restoration: Holes, cracks, and imperfections filled and sanded flush.', 'Priming: Stain-blocking primer applied to all repaired areas and bare surfaces.'] },
    { step: 'Step 3: Premium Application', bullets: ['Execution: Two full coats of premium interior paint applied.', 'Detailing: Clean sharp lines at all transitions executed with precision.'] },
    { step: 'Step 4: Site Restoration & Quality Control', bullets: ['Cleanup: All masking removed, surfaces wiped clean, furniture returned.', 'Final Walkthrough: On-site inspection with client to verify satisfaction.'] },
  ]
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PDFHeader projectName={data.projectName} proposalType="PROFESSIONAL SERVICE PROPOSAL" issueDate={data.issueDate} validUntil={data.validUntil} business={business} />
        <PDFBusinessContact business={business} />
        <PDFFooter page={1} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <PDFClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope={data.projectScope} total={data.totalInvestment} />
        <Text style={styles.sectionHeader}>Section III — Interior Painting Process</Text>
        {steps.map(({ step, bullets }, i) => (
          <View key={i}>
            <Text style={styles.stepTitle}>{step}</Text>
            {bullets.map((b, j) => <Text key={j} style={styles.bullet}>• {b}</Text>)}
          </View>
        ))}
        <PDFFooter page={2} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Section IV — Material Specifications</Text>
        <Text style={{ fontSize: 9, fontStyle: 'italic', marginBottom: 8 }}>Zero Material Markup — all materials invoiced at direct contractor pricing.</Text>
        <PDFLineItems items={data.lineItems} />
        <Text style={styles.sectionHeader}>Section V — Investment & Payment Schedule</Text>
        <PDFPaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
        <Text style={styles.sectionHeader}>Section VI — Warranty & Provisions</Text>
        {PDFWarranty([
          ['White Glove Cleanup', '30–45 minutes of dedicated site cleanup at end of each work day.'],
          ['5-Year Workmanship Warranty', 'All defects remediated at no cost within 5 years.'],
          ['Insurance Coverage', 'General Liability insurance. Certificate available upon request.'],
        ])}
        <PDFSignature />
        <PDFFooter page={3} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      {data.showInsurancePage && (
        <Page size="LETTER" style={styles.page}>
          <PDFInsurance business={business} />
          <PDFFooter page={4} total={4} business={business} />
        </Page>
      )}
    </Document>
  )
}

// ─── EXTERIOR PDF ────────────────────────────────────────────────────────────

function ExteriorPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const tierNames: Record<string, string> = { tier1: 'Tier 1: Latitude®', tier2: 'Tier 2: Duration®', tier3: 'Tier 3: Emerald®' }
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PDFHeader projectName={data.projectName} proposalType="EXTERIOR PROTECTION & FINISHING PROPOSAL" issueDate={data.issueDate} validUntil={data.validUntil} business={business} />
        <PDFBusinessContact business={business} />
        <PDFFooter page={1} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <PDFClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope="Exterior Protection & Level 2 Prep" total={data.totalInvestment} />
        <Text style={styles.sectionHeader}>Section III — 4-Step Exterior Process</Text>
        {[
          { step: 'Step 01: Power Washing', bullets: ['Full exterior pressure wash at 2,500–3,500 PSI.', 'Soft Chemical Wash: mildicide solution to eradicate mold and algae.'] },
          { step: 'Step 02: Scraping, Priming & Stabilization', bullets: ['Level 2 Prep: Hand-scraping all peeling and failing paint.', 'Elastomeric sealant applied to cracks and gaps.'] },
          { step: 'Step 03: Expert Paint Application', bullets: ['Airless sprayers for uniform, millage-controlled coverage.', 'Premium coatings in HOA-approved colors.'] },
          { step: 'Step 04: Final Cleanup & Quality Assurance', bullets: ['Complete removal of all masking and protective materials.', 'Final Walkthrough with client before sign-off.'] },
        ].map(({ step, bullets }, i) => (
          <View key={i}>
            <Text style={styles.stepTitle}>{step}</Text>
            {bullets.map((b, j) => <Text key={j} style={styles.bullet}>• {b}</Text>)}
          </View>
        ))}
        <PDFFooter page={2} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Section IV — Material Specifications</Text>
        <Text style={{ fontSize: 9, marginBottom: 4 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Coating Tier: </Text>{tierNames[data.coatingTier] || data.coatingTier}</Text>
        <Text style={{ fontSize: 9, marginBottom: 8 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Sheen: </Text>{data.sheen}</Text>
        <PDFLineItems items={data.lineItems} />
        <Text style={styles.sectionHeader}>Section V — Investment & Payment Schedule</Text>
        <PDFPaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
        <Text style={styles.sectionHeader}>Section VI — Warranty & Provisions</Text>
        {PDFWarranty([
          ['5-Year Workmanship Warranty', 'All workmanship defects remediated at no cost within 5 years.'],
          ['Insurance Coverage', 'General Liability insurance. Certificate available upon request.'],
        ])}
        <PDFSignature />
        <PDFFooter page={3} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      {data.showInsurancePage && <Page size="LETTER" style={styles.page}><PDFInsurance business={business} /><PDFFooter page={4} total={4} business={business} /></Page>}
    </Document>
  )
}

// ─── CABINET PDF ─────────────────────────────────────────────────────────────

function CabinetPDF({ data, business }: { data: any; business: BusinessInfo }) {
  const tierNames: Record<string, string> = { signature: 'Signature: Emerald® Urethane', elite: 'Elite: Gallery Series™' }
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PDFHeader projectName={data.projectName} proposalType="CABINET REFINISHING & RESTORATION PROPOSAL" issueDate={data.issueDate} validUntil={data.validUntil} business={business} />
        <PDFBusinessContact business={business} />
        <PDFFooter page={1} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <PDFClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope="Factory-Grade Cabinet Refinishing" total={data.totalInvestment} />
        <Text style={styles.sectionHeader}>Section III — 10-Phase Refinishing Process</Text>
        {[
          { step: 'Phase 1: Teardown & Precision Labeling', bullets: ['Careful removal of all doors and drawer fronts.', 'Proprietary labeling system for exact reinstallation.'] },
          { step: 'Phase 2: Protection & Surface Prep', bullets: ['Chemical Degreasing to strip cooking oils and contaminants.', 'EKASANDER Dustless Orbital System sanding.'] },
          { step: 'Phase 3: Industrial Primer System', bullets: ['2-Coat Bonding Primer: Renner 1K 643/648.', 'Tannin Blocking on oak and pine. Inter-coat sanding at 320 grit.'] },
          { step: 'Phase 4: Professional Topcoat & Reinstallation', bullets: ['HVLP fine-finish spraying for factory smooth finish.', 'White-Glove Delivery and precision reinstallation.'] },
        ].map(({ step, bullets }, i) => (
          <View key={i}>
            <Text style={styles.stepTitle}>{step}</Text>
            {bullets.map((b, j) => <Text key={j} style={styles.bullet}>• {b}</Text>)}
          </View>
        ))}
        <PDFFooter page={2} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Section IV — Coating Specifications</Text>
        <Text style={{ fontSize: 9, marginBottom: 8 }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>Selected Coating: </Text>{tierNames[data.coatingTier] || data.coatingTier}</Text>
        <PDFLineItems items={data.lineItems} />
        <Text style={styles.sectionHeader}>Section V — Investment & Payment Schedule</Text>
        <PDFPaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
        <Text style={styles.sectionHeader}>Section VI — Warranty & Provisions</Text>
        {PDFWarranty([
          ['White Glove Cleanup', '30–45 minutes of dedicated cleanup daily.'],
          ['5-Year Workmanship Warranty', 'All workmanship defects remediated at no cost within 5 years.'],
          ['Insurance Coverage', 'General Liability insurance. Certificate available upon request.'],
          ['Coating Cure Maintenance', 'No abrasive cleaners for 30 days while coating cures.'],
        ])}
        <PDFSignature />
        <PDFFooter page={3} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      {data.showInsurancePage && <Page size="LETTER" style={styles.page}><PDFInsurance business={business} /><PDFFooter page={4} total={4} business={business} /></Page>}
    </Document>
  )
}

// ─── CUSTOM PDF ──────────────────────────────────────────────────────────────

function CustomPDF({ data, business }: { data: any; business: BusinessInfo }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <PDFHeader projectName={data.projectName} proposalType="PROFESSIONAL SERVICE PROPOSAL" issueDate={data.issueDate} validUntil={data.validUntil} business={business} />
        <PDFBusinessContact business={business} />
        <PDFFooter page={1} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <PDFClientSummary clientName={data.clientName} clientContact={data.clientContact} clientAddress={data.clientAddress} projectScope={data.projectScope} total={data.totalInvestment} />
        <Text style={styles.sectionHeader}>Section III — Scope of Work</Text>
        <Text style={{ fontSize: 9, lineHeight: 1.6 }}>{data.scopeOfWork || '—'}</Text>
        <PDFFooter page={2} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.sectionHeader}>Section IV — Materials & Specifications</Text>
        <PDFLineItems items={data.lineItems} />
        <Text style={styles.sectionHeader}>Section V — Investment & Payment Schedule</Text>
        <PDFPaymentSchedule total={data.totalInvestment} depositPct={data.depositPct} progressPct={data.progressPct} finalPct={data.finalPct} business={business} />
        <Text style={styles.sectionHeader}>Section VI — Warranty & Provisions</Text>
        {PDFWarranty([
          ['White Glove Cleanup', '30–45 minutes of dedicated cleanup at end of each work day.'],
          ['5-Year Workmanship Warranty', 'All workmanship defects remediated at no cost within 5 years.'],
          ['Insurance Coverage', 'General Liability insurance. Certificate available upon request.'],
        ])}
        <PDFSignature />
        <PDFFooter page={3} total={data.showInsurancePage ? 4 : 3} business={business} />
      </Page>
      {data.showInsurancePage && <Page size="LETTER" style={styles.page}><PDFInsurance business={business} /><PDFFooter page={4} total={4} business={business} /></Page>}
    </Document>
  )
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────

export async function downloadProposalPDF(template: ProposalTemplate, data: any, fileName: string, businessInfo?: BusinessInfo) {
  const business: BusinessInfo = businessInfo ?? { name: 'Business' }
  let doc: React.ReactElement
  switch (template) {
    case 'interior': doc = <InteriorPDF data={data} business={business} />; break
    case 'exterior': doc = <ExteriorPDF data={data} business={business} />; break
    case 'cabinet': doc = <CabinetPDF data={data} business={business} />; break
    default: doc = <CustomPDF data={data} business={business} />
  }
  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
