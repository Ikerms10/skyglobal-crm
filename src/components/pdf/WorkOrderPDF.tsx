'use client'
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from '@react-pdf/renderer'

function fmt(n: number | null | undefined) {
  if (!n && n !== 0) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const G = '#e6ab35'
const DARK = '#1d1c17'
const GRAY = '#666'
const LIGHT_GRAY = '#f4f4f4'

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: DARK, backgroundColor: '#fff' },
  goldBar: { backgroundColor: G, height: 8, marginBottom: 24, marginHorizontal: -40, marginTop: -40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  company: { fontSize: 18, fontWeight: 'bold', color: DARK },
  tagline: { fontSize: 9, color: GRAY, marginTop: 2 },
  woLabel: { fontSize: 20, fontWeight: 'bold', color: G, textAlign: 'right' },
  woId: { fontSize: 11, color: GRAY, textAlign: 'right', marginTop: 2 },
  woDate: { fontSize: 9, color: GRAY, textAlign: 'right', marginTop: 1 },
  divider: { borderTop: `1pt solid #e8e8e8`, marginVertical: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  metaGrid: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: 'bold', color: DARK },
  scopeBox: { backgroundColor: LIGHT_GRAY, borderRadius: 4, padding: 12, marginBottom: 12 },
  scopeText: { fontSize: 10, color: DARK, lineHeight: 1.6 },
  liHeader: { flexDirection: 'row', backgroundColor: DARK, padding: '5 8', borderRadius: 3 },
  liHeaderText: { color: '#fff', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  liRow: { flexDirection: 'row', borderBottom: `0.5pt solid #e8e8e8`, padding: '6 8' },
  liCell: { fontSize: 9, color: DARK },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: '8 8', backgroundColor: DARK, borderRadius: 3, marginTop: 6 },
  totalLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff', marginRight: 16 },
  totalValue: { fontSize: 11, fontWeight: 'bold', color: G },
  termsBox: { backgroundColor: LIGHT_GRAY, borderRadius: 4, padding: 12, marginTop: 16 },
  termText: { fontSize: 9, color: GRAY, marginBottom: 4 },
  sigSection: { marginTop: 24, flexDirection: 'row', gap: 32 },
  sigBlock: { flex: 1 },
  sigLine: { borderTop: `1pt solid ${DARK}`, paddingTop: 4, marginTop: 28 },
  sigLabel: { fontSize: 9, color: GRAY },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center', borderTop: `0.5pt solid #e8e8e8`, paddingTop: 6 },
  footerText: { fontSize: 8, color: GRAY },
})

export interface WorkOrderData {
  id: string
  title: string
  trade: string
  status: string
  subcontractor_name: string | null
  subcontractor_phone: string | null
  subcontractor_email: string | null
  scope_of_work: string | null
  budget: number
  actual_cost: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  project: { title: string; address?: string | null }
  items: Array<{ description: string; quantity: number | null; unit: string | null; unit_price: number | null; total: number | null }>
}

function WorkOrderDocument({ wo }: { wo: WorkOrderData }) {
  const shortId = wo.id.slice(0, 8).toUpperCase()
  const itemsTotal = wo.items.reduce((s, i) => s + (i.total ?? 0), 0)
  const budget = wo.budget ?? 0

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.goldBar} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.company}>SkyGlobal Renovations</Text>
            <Text style={s.tagline}>Professional Painting Services · skyglobalsvcs.com</Text>
          </View>
          <View>
            <Text style={s.woLabel}>WORK ORDER</Text>
            <Text style={s.woId}>WO-{shortId}</Text>
            <Text style={s.woDate}>Date: {fmtDate(wo.created_at.split('T')[0])}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Project info */}
        <View style={s.metaGrid}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Project</Text>
            <Text style={s.metaValue}>{wo.project.title}</Text>
          </View>
          {wo.project.address && (
            <View style={s.metaBlock}>
              <Text style={s.metaLabel}>Location</Text>
              <Text style={s.metaValue}>{wo.project.address}</Text>
            </View>
          )}
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Trade</Text>
            <Text style={s.metaValue}>{wo.trade}</Text>
          </View>
        </View>

        {/* Subcontractor */}
        {wo.subcontractor_name && (
          <>
            <Text style={s.sectionTitle}>Prepared For</Text>
            <View style={s.metaGrid}>
              <View style={s.metaBlock}>
                <Text style={s.metaValue}>{wo.subcontractor_name}</Text>
                {wo.subcontractor_phone && <Text style={{ fontSize: 9, color: GRAY, marginTop: 2 }}>{wo.subcontractor_phone}</Text>}
                {wo.subcontractor_email && <Text style={{ fontSize: 9, color: GRAY }}>{wo.subcontractor_email}</Text>}
              </View>
              <View style={s.metaBlock}>
                {wo.start_date && <><Text style={s.metaLabel}>Start Date</Text><Text style={s.metaValue}>{fmtDate(wo.start_date)}</Text></>}
              </View>
              <View style={s.metaBlock}>
                {wo.end_date && <><Text style={s.metaLabel}>Completion Date</Text><Text style={s.metaValue}>{fmtDate(wo.end_date)}</Text></>}
              </View>
            </View>
          </>
        )}

        {/* Scope of work */}
        {wo.scope_of_work && (
          <>
            <Text style={s.sectionTitle}>Scope of Work</Text>
            <View style={s.scopeBox}>
              <Text style={s.scopeText}>{wo.scope_of_work}</Text>
            </View>
          </>
        )}

        {/* Line items */}
        <Text style={s.sectionTitle}>Line Items</Text>
        {wo.items.length > 0 ? (
          <>
            <View style={s.liHeader}>
              <Text style={[s.liHeaderText, { flex: 0.3 }]}>#</Text>
              <Text style={[s.liHeaderText, { flex: 3 }]}>Description</Text>
              <Text style={[s.liHeaderText, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
              <Text style={[s.liHeaderText, { flex: 0.8, textAlign: 'center' }]}>Unit</Text>
              <Text style={[s.liHeaderText, { flex: 1, textAlign: 'right' }]}>Unit Price</Text>
              <Text style={[s.liHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
            </View>
            {wo.items.map((item, i) => (
              <View key={i} style={[s.liRow, { backgroundColor: i % 2 === 0 ? '#fff' : LIGHT_GRAY }]}>
                <Text style={[s.liCell, { flex: 0.3, color: GRAY }]}>{i + 1}</Text>
                <Text style={[s.liCell, { flex: 3 }]}>{item.description}</Text>
                <Text style={[s.liCell, { flex: 0.8, textAlign: 'center' }]}>{item.quantity ?? '—'}</Text>
                <Text style={[s.liCell, { flex: 0.8, textAlign: 'center' }]}>{item.unit ?? '—'}</Text>
                <Text style={[s.liCell, { flex: 1, textAlign: 'right' }]}>{fmt(item.unit_price)}</Text>
                <Text style={[s.liCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{fmt(item.total)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TOTAL BUDGET</Text>
              <Text style={s.totalValue}>{fmt(itemsTotal || budget)}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 10, color: GRAY, marginBottom: 8 }}>No line items specified.</Text>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>TOTAL BUDGET</Text>
              <Text style={s.totalValue}>{fmt(budget)}</Text>
            </View>
          </>
        )}

        {/* Terms */}
        <View style={s.termsBox}>
          <Text style={{ fontSize: 9, fontWeight: 'bold', color: DARK, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Terms & Conditions</Text>
          {wo.end_date && <Text style={s.termText}>• Work must be completed by {fmtDate(wo.end_date)}.</Text>}
          <Text style={s.termText}>• Payment upon completion inspection and approval.</Text>
          <Text style={s.termText}>• All work subject to quality review by SkyGlobal Renovations.</Text>
          <Text style={s.termText}>• Subcontractor responsible for cleanup and safety compliance.</Text>
        </View>

        {/* Signatures */}
        <View style={s.sigSection}>
          <View style={s.sigBlock}>
            <Text style={{ fontSize: 9, color: GRAY }}>Approved by SkyGlobal Renovations</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Signature / Date</Text>
          </View>
          <View style={s.sigBlock}>
            <Text style={{ fontSize: 9, color: GRAY }}>Subcontractor Acknowledgment</Text>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Signature / Date</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>SkyGlobal Renovations · WO-{shortId} · {wo.project.title}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function DownloadWorkOrderButton({ wo }: { wo: WorkOrderData }) {
  const filename = `WO-${wo.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
  return (
    <PDFDownloadLink
      document={<WorkOrderDocument wo={wo} />}
      fileName={filename}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <button style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)', cursor: loading ? 'wait' : 'pointer',
          fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
        }}>
          📋 {loading ? 'Generating…' : 'Download PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
