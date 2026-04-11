'use client'
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', backgroundColor: '#fff' },
  header: { marginBottom: 24, borderBottom: '2pt solid #e6ab35', paddingBottom: 16 },
  company: { fontSize: 18, fontWeight: 'bold', color: '#1d1c17', marginBottom: 4 },
  tagline: { fontSize: 10, color: '#666', marginBottom: 2 },
  docType: { fontSize: 22, fontWeight: 'bold', color: '#e6ab35', marginTop: 12, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 8, fontWeight: 'bold', color: '#9a9585', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  label: { fontSize: 9, color: '#666', marginBottom: 1 },
  value: { fontSize: 10, color: '#1a1a1a', fontWeight: 'bold' },
  divider: { borderTop: '1pt solid #e6e6e6', marginVertical: 12 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: '6 8', marginBottom: 2, borderRadius: 2 },
  tableRow: { flexDirection: 'row', padding: '5 8', borderBottom: '0.5pt solid #eee' },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'center' },
  col4: { flex: 1, textAlign: 'right' },
  col5: { flex: 1, textAlign: 'right' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: '5 8', borderTop: '1pt solid #e6ab35' },
  totalLabel: { fontSize: 10, fontWeight: 'bold', width: 80, textAlign: 'right', marginRight: 8 },
  totalValue: { fontSize: 10, fontWeight: 'bold', width: 80, textAlign: 'right', color: '#e6ab35' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'flex-end', padding: '6 8', backgroundColor: '#1d1c17', borderRadius: 4 },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', width: 80, textAlign: 'right', marginRight: 8, color: '#fff' },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold', width: 80, textAlign: 'right', color: '#e6ab35' },
  terms: { marginTop: 20, padding: '10 12', backgroundColor: '#f9f9f9', borderRadius: 4 },
  signature: { flexDirection: 'row', gap: 40, marginTop: 24 },
  signLine: { flex: 1, borderTop: '1pt solid #1a1a1a', paddingTop: 4, fontSize: 9, color: '#666' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9a9585', borderTop: '0.5pt solid #eee', paddingTop: 8 },
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
  if (!n && n !== 0) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EstimateDocument({ type, project, customer, lineItems, projectId }: PDFProps) {
  const subtotal = lineItems.reduce((s, li) => s + (li.total ?? ((li.quantity ?? 1) * (li.unit_price ?? 0))), 0)
  const balance = (project.contract_value ?? subtotal) - (project.amount_paid ?? 0)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const docNum = projectId.slice(-8).toUpperCase()

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.company}>SKYGLOBAL RENOVATIONS</Text>
          <Text style={styles.tagline}>Professional Painting Services</Text>
          <Text style={styles.tagline}>skyglobalsvcs.com</Text>
          <Text style={styles.docType}>{type === 'estimate' ? 'ESTIMATE' : 'INVOICE'} #{docNum}</Text>
          <Text style={styles.label}>Date: {today}</Text>
        </View>

        <View style={styles.row}>
          {/* Prepared For */}
          <View>
            <Text style={styles.sectionTitle}>Prepared For</Text>
            <Text style={styles.value}>{customer.name}</Text>
            {customer.address && <Text style={styles.label}>{customer.address}</Text>}
            {customer.phone && <Text style={styles.label}>{customer.phone}</Text>}
            {customer.email && <Text style={styles.label}>{customer.email}</Text>}
          </View>
          {/* Project Info */}
          <View>
            <Text style={styles.sectionTitle}>Project</Text>
            <Text style={styles.value}>{project.title}</Text>
            {project.address && <Text style={styles.label}>{project.address}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Scope of Work table */}
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Scope of Work</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.col1, { fontSize: 8, fontWeight: 'bold', color: '#555' }]}>Description</Text>
          <Text style={[styles.col2, { fontSize: 8, fontWeight: 'bold', color: '#555' }]}>Qty</Text>
          <Text style={[styles.col3, { fontSize: 8, fontWeight: 'bold', color: '#555' }]}>Unit</Text>
          <Text style={[styles.col4, { fontSize: 8, fontWeight: 'bold', color: '#555' }]}>Price</Text>
          <Text style={[styles.col5, { fontSize: 8, fontWeight: 'bold', color: '#555' }]}>Total</Text>
        </View>

        {lineItems.map((li, i) => (
          <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }]}>
            <Text style={styles.col1}>{li.description}</Text>
            <Text style={styles.col2}>{li.quantity ?? 1}</Text>
            <Text style={styles.col3}>{li.unit ?? ''}</Text>
            <Text style={styles.col4}>{fmt(li.unit_price)}</Text>
            <Text style={styles.col5}>{fmt(li.total ?? (li.quantity ?? 1) * (li.unit_price ?? 0))}</Text>
          </View>
        ))}

        <View style={{ marginTop: 8 }}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>{type === 'invoice' ? 'Total:' : 'TOTAL:'}</Text>
            <Text style={styles.grandTotalValue}>{fmt(project.contract_value ?? subtotal)}</Text>
          </View>

          {type === 'invoice' && (
            <>
              <View style={[styles.totalsRow, { marginTop: 4 }]}>
                <Text style={styles.totalLabel}>Amount Paid:</Text>
                <Text style={[styles.totalValue, { color: '#10b981' }]}>{fmt(project.amount_paid ?? 0)}</Text>
              </View>
              <View style={[styles.totalsRow]}>
                <Text style={[styles.totalLabel, { color: '#ef4444' }]}>Balance Due:</Text>
                <Text style={[styles.totalValue, { color: '#ef4444' }]}>{fmt(balance)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Terms */}
        <View style={styles.terms}>
          <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>Terms & Conditions</Text>
          <Text style={{ fontSize: 9, color: '#555', lineHeight: 1.5 }}>
            {type === 'estimate'
              ? '• 50% deposit required to schedule work.\n• Remaining balance due upon completion.\n• Estimate valid for 30 days.\n• Any additional work outside this scope will be quoted separately.'
              : '• Payment due upon receipt.\n• Late payments subject to 1.5% monthly interest.\n• Thank you for your business!'}
          </Text>
        </View>

        {/* Signature (estimate only) */}
        {type === 'estimate' && (
          <View style={styles.signature}>
            <View style={styles.signLine}>
              <Text>Client Signature</Text>
            </View>
            <View style={styles.signLine}>
              <Text>Date</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          SkyGlobal Renovations · Professional Painting Services · skyglobalsvcs.com
        </Text>
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
