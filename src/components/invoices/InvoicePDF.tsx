import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { Invoice } from '@/types'
import { createClient } from '@/lib/supabase/client'

// NOTE: @react-pdf/renderer does not resolve CSS variables — all colors are hex.
const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  darkHeader: { backgroundColor: '#1d1c17', padding: '24 32', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logoText: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#e6ab35' },
  logoSub: { fontSize: 9, color: '#9a9585', marginTop: 2 },
  invoiceTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#e6ab35', textAlign: 'right' },
  invoiceNum: { fontSize: 10, color: '#9a9585', textAlign: 'right', marginTop: 2 },
  body: { padding: '24 32' },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  billSection: { width: '45%' },
  infoSection: { width: '45%', alignItems: 'flex-end' },
  sectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#6b7280', letterSpacing: 0.8, marginBottom: 6 },
  value: { fontSize: 10, color: '#1a1a1a', lineHeight: 1.6 },
  lineHeader: { flexDirection: 'row', backgroundColor: '#1d1c17', padding: '6 10' },
  lineHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#e6ab35' },
  lineRow: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb', padding: '6 10' },
  lineCell: { fontSize: 9 },
  totalsBox: { alignItems: 'flex-end', marginTop: 16 },
  balanceDue: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8, paddingTop: 8, borderTop: '1.5 solid #1d1c17' },
  balanceLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1d1c17', width: 100, textAlign: 'right' },
  balanceValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#e6ab35', width: 80, textAlign: 'right' },
  payBox: { marginTop: 24, padding: '12 16', backgroundColor: '#f9f9f7', border: '1 solid #e5e7eb', borderRadius: 4 },
  payTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#374151', letterSpacing: 0.8, marginBottom: 6 },
  payText: { fontSize: 9, color: '#374151', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, borderTop: '1 solid #e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
})

function fmtCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildPDFDoc(inv: Invoice, lineItems: Array<{ description: string; quantity: number | null; unit_price: number | null; total: number | null }>) {
  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.darkHeader}>
          <View>
            <Text style={s.logoText}>SkyGlobal</Text>
            <Text style={s.logoSub}>SkyGlobal Renovations LLC</Text>
            <Text style={{ fontSize: 8, color: '#9a9585', marginTop: 8, lineHeight: 1.6 }}>
              {'352-782-2460 | 470-469-9961\nskyglobalsvcs@gmail.com\nskyglobalsvcs.com'}
            </Text>
          </View>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.invoiceNum}>#{inv.invoice_number}</Text>
          </View>
        </View>

        <View style={s.body}>
          <View style={s.twoCol}>
            <View style={s.billSection}>
              <Text style={s.sectionLabel}>Bill To</Text>
              <Text style={s.value}>{(inv.customer as any)?.name ?? '—'}</Text>
            </View>
            <View style={s.infoSection}>
              <Text style={s.sectionLabel}>Invoice Date</Text>
              <Text style={s.value}>{inv.issue_date ? fmtDate(inv.issue_date) : '—'}</Text>
              {inv.due_date && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 10 }]}>Due Date</Text>
                  <Text style={s.value}>{fmtDate(inv.due_date)}</Text>
                </>
              )}
              <Text style={[s.sectionLabel, { marginTop: 10 }]}>Payment Terms</Text>
              <Text style={s.value}>{inv.payment_terms}</Text>
            </View>
          </View>

          <View style={s.lineHeader}>
            <Text style={[s.lineHeaderCell, { width: '55%' }]}>Description</Text>
            <Text style={[s.lineHeaderCell, { width: '10%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.lineHeaderCell, { width: '15%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[s.lineHeaderCell, { width: '20%', textAlign: 'right' }]}>Amount</Text>
          </View>

          {lineItems.map((item, i) => (
            <View key={i} style={s.lineRow}>
              <Text style={[s.lineCell, { width: '55%' }]}>{item.description}</Text>
              <Text style={[s.lineCell, { width: '10%', textAlign: 'center' }]}>{item.quantity ?? ''}</Text>
              <Text style={[s.lineCell, { width: '15%', textAlign: 'right' }]}>{item.unit_price != null ? fmtCurrency(item.unit_price) : ''}</Text>
              <Text style={[s.lineCell, { width: '20%', textAlign: 'right' }]}>{item.total != null ? fmtCurrency(item.total) : ''}</Text>
            </View>
          ))}

          <View style={s.totalsBox}>
            <View style={s.balanceDue}>
              <Text style={s.balanceLabel}>Total Due</Text>
              <Text style={s.balanceValue}>{fmtCurrency(inv.total)}</Text>
            </View>
          </View>

          <View style={s.payBox}>
            <Text style={s.payTitle}>Payment Instructions</Text>
            <Text style={s.payText}>Pay via Zelle to skyglobalsvcs@gmail.com</Text>
            <Text style={s.payText}>Questions? Call 352-782-2460 or 470-469-9961</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>SkyGlobal Renovations LLC · skyglobalsvcs.com</Text>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadInvoicePDF(inv: Invoice) {
  const supabase = createClient()
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('description, quantity, unit_price, total')
    .eq('invoice_id', inv.id)
    .order('sort_order')

  const doc = buildPDFDoc(inv, lineItems ?? [])
  const blob = await pdf(doc).toBlob()
  const clientSlug = ((inv.customer as any)?.name ?? 'Client').replace(/\s+/g, '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SkyGlobal_Invoice_${inv.invoice_number}_${clientSlug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
