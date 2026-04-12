'use client'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image } from '@react-pdf/renderer'

const GOLD = '#e6ab35'
const DARK = '#1d1c17'
const TEXT = '#1a1a1a'
const MUTED = '#555555'
const LIGHT = '#888888'
const BORDER = '#e0e0e0'
const PAGE_PAD = 48

const s = StyleSheet.create({
  page: { padding: PAGE_PAD, fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#fff', lineHeight: 1.4 },
  footer: { position: 'absolute', bottom: 26, left: PAGE_PAD, right: PAGE_PAD, textAlign: 'center', fontSize: 7.5, color: '#aaa', borderTop: '0.5pt solid #e8e8e8', paddingTop: 6 },

  // ── Header band ─────────────────────────────────────────────────
  headerBand: { backgroundColor: DARK, margin: -PAGE_PAD, marginBottom: 0, padding: '20 ' + PAGE_PAD, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -PAGE_PAD },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoImg: { width: 48, height: 48, objectFit: 'contain' },
  logoFallback: { width: 44, height: 44, backgroundColor: GOLD, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontSize: 16, fontWeight: 'bold', color: DARK },
  headerCompany: { fontSize: 16, fontWeight: 'bold', color: '#fff', lineHeight: 1.1 },
  headerSub: { fontSize: 9, color: '#aaa', lineHeight: 1.2 },
  headerRight: { alignItems: 'flex-end' },
  docTypeLabel: { fontSize: 22, fontWeight: 'bold', color: GOLD, lineHeight: 1 },
  docNumLabel: { fontSize: 9, color: '#bbb', marginTop: 2 },
  docDateLabel: { fontSize: 9, color: '#bbb', marginTop: 1 },

  // ── Body ─────────────────────────────────────────────────────────
  body: { paddingTop: 24 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoBlock: { flex: 1 },
  infoLabel: { fontSize: 7.5, fontWeight: 'bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  infoValue: { fontSize: 10, fontWeight: 'bold', color: TEXT, marginBottom: 1 },
  infoMeta: { fontSize: 9, color: MUTED, marginBottom: 1 },

  divider: { borderTop: '1pt solid ' + BORDER, marginVertical: 14 },

  // ── Invoice status badge ─────────────────────────────────────────
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, fontSize: 9, fontWeight: 'bold' },

  // ── Line items table ─────────────────────────────────────────────
  tableLabel: { fontSize: 8, fontWeight: 'bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: '6 8', borderRadius: 3 },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottom: '0.5pt solid #efefef' },
  tableRowAlt: { flexDirection: 'row', padding: '6 8', borderBottom: '0.5pt solid #efefef', backgroundColor: '#fafafa' },
  col1: { flex: 3.5 },
  col2: { flex: 0.8, textAlign: 'center' },
  col3: { flex: 0.8, textAlign: 'center' },
  col4: { flex: 1, textAlign: 'right' },
  col5: { flex: 1, textAlign: 'right' },
  thText: { fontSize: 8, fontWeight: 'bold', color: MUTED },

  // ── Totals ───────────────────────────────────────────────────────
  totalsSection: { marginTop: 10, alignItems: 'flex-end' },
  totalLine: { flexDirection: 'row', justifyContent: 'flex-end', padding: '3 8', gap: 0 },
  totalLineLabel: { fontSize: 9.5, color: MUTED, width: 110, textAlign: 'right', marginRight: 8 },
  totalLineValue: { fontSize: 9.5, color: TEXT, fontWeight: 'bold', width: 80, textAlign: 'right' },
  grandTotalBar: { flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: DARK, borderRadius: 4, padding: '7 10', marginTop: 4, gap: 0 },
  grandTotalLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff', width: 110, textAlign: 'right', marginRight: 8 },
  grandTotalValue: { fontSize: 11, fontWeight: 'bold', color: GOLD, width: 80, textAlign: 'right' },
  paidLine: { flexDirection: 'row', justifyContent: 'flex-end', padding: '3 8' },
  paidLabel: { fontSize: 9.5, color: '#10b981', width: 110, textAlign: 'right', marginRight: 8 },
  paidValue: { fontSize: 9.5, color: '#10b981', fontWeight: 'bold', width: 80, textAlign: 'right' },
  balanceLabel: { fontSize: 10, fontWeight: 'bold', color: '#ef4444', width: 110, textAlign: 'right', marginRight: 8 },
  balanceValue: { fontSize: 10, fontWeight: 'bold', color: '#ef4444', width: 80, textAlign: 'right' },

  // ── Payment notice ────────────────────────────────────────────────
  noticeBox: { marginTop: 16, padding: '8 12', backgroundColor: '#fffbf0', borderLeft: '3pt solid ' + GOLD },
  noticeText: { fontSize: 8.5, color: '#7a5a00', lineHeight: 1.55 },

  // ── Terms ─────────────────────────────────────────────────────────
  termsBox: { marginTop: 14, padding: '10 12', backgroundColor: '#f9f9f9', borderRadius: 4 },
  termsLabel: { fontSize: 7.5, fontWeight: 'bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  termsBullet: { fontSize: 8.5, color: MUTED, marginBottom: 3, lineHeight: 1.5 },

  // ── Signature ─────────────────────────────────────────────────────
  signRow: { flexDirection: 'row', gap: 40, marginTop: 28 },
  signLine: { flex: 1, borderTop: '1pt solid ' + TEXT, paddingTop: 4, fontSize: 9, color: MUTED },
})

interface LineItem { description: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number | null }

interface PDFProps {
  type: 'estimate' | 'invoice'
  project: { title: string; address?: string | null; contract_value?: number | null; amount_paid?: number }
  customer: { name: string; address?: string | null; phone?: string | null; email?: string | null }
  lineItems: LineItem[]
  projectId: string
}

function fmt(n: number | null | undefined) {
  if (n == null) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EstimateDocument({ type, project, customer, lineItems, projectId }: PDFProps) {
  const subtotal = lineItems.reduce((s, li) => s + (li.total ?? (li.quantity ?? 1) * (li.unit_price ?? 0)), 0)
  const contractTotal = project.contract_value ?? subtotal
  const amountPaid = project.amount_paid ?? 0
  const balance = contractTotal - amountPaid
  const isPaid = balance <= 0
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const docNum = `${type === 'estimate' ? 'EST' : 'INV'}-${projectId.slice(-8).toUpperCase()}`
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : undefined
  const footerText = `SkyGlobal Renovations LLC  ·  352-782-2460  ·  skyglobalsvcs@gmail.com  ·  skyglobalsvcs.com`

  return (
    <Document>
      <Page size="LETTER" style={s.page}>

        {/* Dark header band */}
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            {logoUrl ? (
              <Image src={logoUrl} style={s.logoImg} />
            ) : (
              <View style={s.logoFallback}>
                <Text style={s.logoFallbackText}>SG</Text>
              </View>
            )}
            <View>
              <Text style={s.headerCompany}>SkyGlobal Renovations LLC</Text>
              <Text style={s.headerSub}>skyglobalsvcs.com  ·  352-782-2460</Text>
              <Text style={s.headerSub}>skyglobalsvcs@gmail.com</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.docTypeLabel}>{type === 'estimate' ? 'ESTIMATE' : 'INVOICE'}</Text>
            <Text style={s.docNumLabel}>#{docNum}</Text>
            <Text style={s.docDateLabel}>Date: {today}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* Status badge for invoices */}
          {type === 'invoice' && (
            <View style={s.statusRow}>
              <View style={[s.statusBadge, { backgroundColor: isPaid ? '#d1fae5' : '#fee2e2' }]}>
                <Text style={{ color: isPaid ? '#065f46' : '#991b1b' }}>
                  {isPaid ? '✓ PAID IN FULL' : balance === contractTotal ? 'UNPAID' : 'PARTIAL PAYMENT'}
                </Text>
              </View>
            </View>
          )}

          {/* Bill to / Project */}
          <View style={s.infoRow}>
            <View style={s.infoBlock}>
              <Text style={s.infoLabel}>Bill To</Text>
              <Text style={s.infoValue}>{customer.name}</Text>
              {customer.address && <Text style={s.infoMeta}>{customer.address}</Text>}
              {customer.phone && <Text style={s.infoMeta}>{customer.phone}</Text>}
              {customer.email && <Text style={s.infoMeta}>{customer.email}</Text>}
            </View>
            <View style={[s.infoBlock, { alignItems: 'flex-end' }]}>
              <Text style={s.infoLabel}>Project</Text>
              <Text style={[s.infoValue, { textAlign: 'right' }]}>{project.title}</Text>
              {project.address && <Text style={[s.infoMeta, { textAlign: 'right' }]}>{project.address}</Text>}
              {type === 'invoice' && (
                <Text style={[s.infoMeta, { textAlign: 'right', marginTop: 8 }]}>
                  Payment Due: Upon Receipt
                </Text>
              )}
              {type === 'estimate' && (
                <Text style={[s.infoMeta, { textAlign: 'right', marginTop: 8 }]}>
                  Valid for: 30 Days
                </Text>
              )}
            </View>
          </View>

          <View style={s.divider} />

          {/* Scope / Line Items */}
          <Text style={s.tableLabel}>Scope of Work</Text>
          <View style={s.tableHeader}>
            <Text style={[s.thText, s.col1]}>Description</Text>
            <Text style={[s.thText, s.col2]}>Qty</Text>
            <Text style={[s.thText, s.col3]}>Unit</Text>
            <Text style={[s.thText, s.col4]}>Unit Price</Text>
            <Text style={[s.thText, s.col5]}>Total</Text>
          </View>

          {lineItems.map((li, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={[{ fontSize: 9.5, color: TEXT }, s.col1]}>{li.description}</Text>
              <Text style={[{ fontSize: 9.5, color: MUTED }, s.col2]}>{li.quantity ?? 1}</Text>
              <Text style={[{ fontSize: 9.5, color: MUTED }, s.col3]}>{li.unit ?? ''}</Text>
              <Text style={[{ fontSize: 9.5, color: MUTED }, s.col4]}>{fmt(li.unit_price)}</Text>
              <Text style={[{ fontSize: 9.5, color: TEXT, fontWeight: 'bold' }, s.col5]}>
                {fmt(li.total ?? (li.quantity ?? 1) * (li.unit_price ?? 0))}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={s.totalsSection}>
            <View style={s.totalLine}>
              <Text style={s.totalLineLabel}>Subtotal:</Text>
              <Text style={s.totalLineValue}>{fmt(subtotal)}</Text>
            </View>
            <View style={s.grandTotalBar}>
              <Text style={s.grandTotalLabel}>TOTAL:</Text>
              <Text style={s.grandTotalValue}>{fmt(contractTotal)}</Text>
            </View>

            {type === 'invoice' && (
              <>
                <View style={s.paidLine}>
                  <Text style={s.paidLabel}>Amount Paid:</Text>
                  <Text style={s.paidValue}>{fmt(amountPaid)}</Text>
                </View>
                <View style={s.paidLine}>
                  <Text style={[s.balanceLabel]}>Balance Due:</Text>
                  <Text style={[s.balanceValue]}>{fmt(Math.max(balance, 0))}</Text>
                </View>
              </>
            )}
          </View>

          {/* Payment notice */}
          <View style={s.noticeBox}>
            <Text style={s.noticeText}>
              {type === 'estimate'
                ? 'Payment Schedule: 30% deposit due 48 hours before start · 40% due at 50% completion · 30% final balance due upon completion & walkthrough.\nPrices reflect cash/check/transfer. Credit/debit card payments incur a 3.9% processing fee.'
                : 'Payment is due upon receipt. Prices reflect cash/check/transfer. Credit/debit card payments incur a 3.9% processing fee.\nLate payments are subject to a 1.5% monthly interest charge.'}
            </Text>
          </View>

          {/* Terms */}
          <View style={s.termsBox}>
            <Text style={s.termsLabel}>Terms &amp; Conditions</Text>
            {type === 'estimate' ? (
              <>
                <Text style={s.termsBullet}>• This estimate is valid for 30 days from the date of issuance.</Text>
                <Text style={s.termsBullet}>• All work is covered by a 5-Year Workmanship Warranty (peeling, blistering, chipping from improper application).</Text>
                <Text style={s.termsBullet}>• SkyGlobal carries $2 Million in General Liability Insurance — Policy CEG-00312198-00 (Coterie Insurance).</Text>
                <Text style={s.termsBullet}>• Any additional work outside this scope will be quoted separately as a written change order.</Text>
              </>
            ) : (
              <>
                <Text style={s.termsBullet}>• Payment due upon receipt. Thank you for trusting SkyGlobal Renovations.</Text>
                <Text style={s.termsBullet}>• 5-Year Workmanship Warranty is activated upon receipt of final balance in full.</Text>
                <Text style={s.termsBullet}>• SkyGlobal carries $2 Million in General Liability Insurance — Policy CEG-00312198-00.</Text>
              </>
            )}
          </View>

          {/* Signature — estimate only */}
          {type === 'estimate' && (
            <View style={s.signRow}>
              <View style={s.signLine}><Text>Client Acceptance Signature</Text></View>
              <View style={s.signLine}><Text>Date</Text></View>
            </View>
          )}

        </View>

        <Text style={s.footer}>{footerText}</Text>
      </Page>
    </Document>
  )
}

export function DownloadEstimateButton({ project, customer, lineItems, projectId, type }: PDFProps) {
  const filename = `SkyGlobal-${type === 'estimate' ? 'Estimate' : 'Invoice'}-${customer.name.replace(/\s+/g, '-')}.pdf`

  return (
    <PDFDownloadLink
      document={<EstimateDocument type={type} project={project} customer={customer} lineItems={lineItems} projectId={projectId} />}
      fileName={filename}
    >
      {({ loading }) => (
        <button
          className="inline-flex items-center gap-2 bg-[#252419] border border-[#2e2d26] text-[#efeae2] hover:bg-[#2e2d26] text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          {loading ? '⏳ Generating...' : type === 'estimate' ? '📄 Download Estimate' : '🧾 Download Invoice'}
        </button>
      )}
    </PDFDownloadLink>
  )
}

export default EstimateDocument
