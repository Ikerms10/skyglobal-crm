import { Document, Page, Text, View, Image, StyleSheet, pdf } from '@react-pdf/renderer'
import { Invoice } from '@/types'
import { createClient } from '@/lib/supabase/client'

// NOTE: @react-pdf/renderer does not resolve CSS variables — all colors are hardcoded hex.
const DARK        = '#1d1c17'
const GOLD        = '#e6ab35'
const GOLD_DARK   = '#b8891f'
const TEXT        = '#1d1c17'
const TEXT_BODY   = '#3a3028'
const TEXT_MUTED  = '#5c5240'
const SURFACE     = '#faf8f4'
const BORDER      = '#e8e0d4'
const GREEN       = '#1a7a3c'
const GREEN_BG    = '#eaf4ed'
const BLUE        = '#2d6fa3'
const BLUE_BG     = '#e8f0f8'

export interface BusinessInfo {
  name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  logoUrl?: string | null
}

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    // Route through server-side proxy to bypass browser CORS on Supabase Storage URLs.
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

const s = StyleSheet.create({
  page:            { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: SURFACE },
  darkHeader:      { backgroundColor: DARK, padding: '28 36', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo:            { width: 48, height: 48, borderRadius: 6, marginBottom: 10, objectFit: 'contain' },
  businessName:    { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 0.5 },
  businessSub:     { fontSize: 8, color: '#a89878', marginTop: 3, lineHeight: 1.7 },
  invoiceLabel:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: GOLD_DARK, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'right', marginBottom: 6 },
  invoiceNum:      { fontSize: 32, fontFamily: 'Helvetica-Bold', color: GOLD, textAlign: 'right', lineHeight: 1 },
  body:            { padding: '28 36' },
  goldRule:        { height: 1.5, backgroundColor: GOLD, marginBottom: 20 },
  thinRule:        { height: 1, backgroundColor: BORDER, marginBottom: 16 },
  twoCol:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  colLeft:         { width: '48%' },
  colRight:        { width: '48%', alignItems: 'flex-end' },
  sectionLabel:    { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: GOLD_DARK, letterSpacing: 1.2, marginBottom: 6 },
  fieldLabel:      { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: TEXT_MUTED, letterSpacing: 1, marginTop: 10, marginBottom: 3 },
  valueText:       { fontSize: 11, color: TEXT_BODY, lineHeight: 1.6 },
  clientName:      { fontSize: 14, fontFamily: 'Helvetica-Bold', color: TEXT, marginBottom: 3 },
  lineHeader:      { flexDirection: 'row', backgroundColor: DARK, padding: '8 12', borderRadius: 4 },
  lineHeaderCell:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: GOLD, letterSpacing: 0.6 },
  lineRow:         { flexDirection: 'row', padding: '8 12', borderBottom: `1 solid ${BORDER}` },
  lineRowAlt:      { flexDirection: 'row', padding: '8 12', backgroundColor: '#f5f0ea', borderBottom: `1 solid ${BORDER}` },
  lineCell:        { fontSize: 9, color: TEXT_BODY, lineHeight: 1.4 },
  lineCellMuted:   { fontSize: 9, color: TEXT_MUTED },
  totalsArea:      { alignItems: 'flex-end', marginTop: 20 },
  subtotalRow:     { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 6 },
  subtotalLabel:   { fontSize: 9, color: TEXT_MUTED, width: 120, textAlign: 'right', marginRight: 20 },
  subtotalValue:   { fontSize: 9, color: TEXT_BODY, width: 90, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  totalBar:        { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', backgroundColor: DARK, padding: '10 16', borderRadius: 6, marginTop: 8 },
  totalBarLabel:   { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#c8b090', width: 120, textAlign: 'right', marginRight: 20 },
  totalBarValue:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GOLD, width: 110, textAlign: 'right' },
  payBox:          { marginTop: 28, padding: '16 20', backgroundColor: '#f5f0ea', borderLeft: `3 solid ${GOLD}`, borderRadius: 4 },
  payTitle:        { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: GOLD_DARK, letterSpacing: 1, marginBottom: 8 },
  payLine:         { fontSize: 9, color: TEXT_BODY, lineHeight: 1.7 },
  statusBadge:     { padding: '4 10', borderRadius: 20, alignSelf: 'flex-start' },
  footer:          { position: 'absolute', bottom: 24, left: 36, right: 36, borderTop: `1 solid ${BORDER}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: TEXT_MUTED },
})

function fmtCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

type LineItem = { description: string; quantity: number | null; unit_price: number | null; total: number | null }

function buildPDFDoc(
  inv: Invoice,
  lineItems: LineItem[],
  business: BusinessInfo,
  logoDataUrl: string | null,
) {
  const clientName = (inv.customer as any)?.name ?? inv.notes ?? '—'
  const paymentContact = business.email || business.phone || ''
  const footerBiz = [business.name, business.website].filter(Boolean).join(' · ')
  const isPaid = inv.status === 'paid'

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Dark header ─────────────────────────────────────────── */}
        <View style={s.darkHeader}>
          <View>
            {logoDataUrl ? (
              <Image src={logoDataUrl} style={s.logo} />
            ) : null}
            <Text style={s.businessName}>{business.name}</Text>
            <Text style={s.businessSub}>
              {[business.phone, business.email, business.website].filter(Boolean).join('\n')}
            </Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>Invoice</Text>
            <Text style={s.invoiceNum}>#{inv.invoice_number}</Text>
            {isPaid && (
              <View style={{ marginTop: 8, backgroundColor: GREEN, padding: '4 10', borderRadius: 20, alignSelf: 'flex-end' }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.8 }}>PAID</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>
          <View style={s.goldRule} />

          {/* ── Bill To / Invoice Info ───────────────────────────── */}
          <View style={s.twoCol}>
            <View style={s.colLeft}>
              <Text style={s.sectionLabel}>Bill To</Text>
              <Text style={s.clientName}>{clientName}</Text>
              {inv.notes && (inv.customer as any)?.name && (
                <Text style={s.valueText}>{inv.notes}</Text>
              )}
            </View>
            <View style={s.colRight}>
              {inv.issue_date && (
                <>
                  <Text style={[s.fieldLabel, { textAlign: 'right', marginTop: 0 }]}>Invoice Date</Text>
                  <Text style={[s.valueText, { textAlign: 'right' }]}>{fmtDate(inv.issue_date)}</Text>
                </>
              )}
              {inv.due_date && (
                <>
                  <Text style={[s.fieldLabel, { textAlign: 'right' }]}>Due Date</Text>
                  <Text style={[s.valueText, { textAlign: 'right', color: isPaid ? GREEN : TEXT_BODY }]}>
                    {fmtDate(inv.due_date)}
                  </Text>
                </>
              )}
              {inv.payment_terms && (
                <>
                  <Text style={[s.fieldLabel, { textAlign: 'right' }]}>Payment Terms</Text>
                  <Text style={[s.valueText, { textAlign: 'right' }]}>{inv.payment_terms}</Text>
                </>
              )}
              {inv.paid_at && (
                <>
                  <Text style={[s.fieldLabel, { textAlign: 'right' }]}>Paid On</Text>
                  <Text style={[s.valueText, { textAlign: 'right', color: GREEN }]}>{fmtDate(inv.paid_at)}</Text>
                </>
              )}
            </View>
          </View>

          <View style={s.thinRule} />

          {/* ── Line items table ──────────────────────────────────── */}
          <View style={s.lineHeader}>
            <Text style={[s.lineHeaderCell, { width: '55%' }]}>Description</Text>
            <Text style={[s.lineHeaderCell, { width: '10%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[s.lineHeaderCell, { width: '17%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[s.lineHeaderCell, { width: '18%', textAlign: 'right' }]}>Amount</Text>
          </View>

          {lineItems.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? s.lineRow : s.lineRowAlt} wrap={false}>
              <Text style={[s.lineCell, { width: '55%' }]}>{item.description}</Text>
              <Text style={[s.lineCellMuted, { width: '10%', textAlign: 'center' }]}>
                {item.quantity ?? ''}
              </Text>
              <Text style={[s.lineCellMuted, { width: '17%', textAlign: 'right' }]}>
                {item.unit_price != null ? fmtCurrency(item.unit_price) : ''}
              </Text>
              <Text style={[s.lineCell, { width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>
                {item.total != null ? fmtCurrency(item.total) : ''}
              </Text>
            </View>
          ))}

          {/* ── Totals ───────────────────────────────────────────── */}
          <View style={s.totalsArea}>
            <View style={s.totalBar} wrap={false}>
              <Text style={s.totalBarLabel}>{isPaid ? 'Total Paid' : 'Balance Due'}</Text>
              <Text style={s.totalBarValue}>{fmtCurrency(inv.total)}</Text>
            </View>
          </View>

          {/* ── Payment instructions ─────────────────────────────── */}
          {!isPaid && paymentContact && (
            <View style={s.payBox} wrap={false}>
              <Text style={s.payTitle}>Payment Instructions</Text>
              {business.email && (
                <Text style={s.payLine}>Pay via Zelle or bank transfer to {business.email}</Text>
              )}
              {business.phone && (
                <Text style={s.payLine}>Questions? Call or text {business.phone}</Text>
              )}
              {business.website && (
                <Text style={s.payLine}>Online: {business.website}</Text>
              )}
            </View>
          )}
        </View>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <View style={s.footer} fixed>
          <Text>{footerBiz || business.name}</Text>
          <Text>Thank you for your business!</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function downloadInvoicePDF(inv: Invoice, business: BusinessInfo) {
  const supabase = createClient()
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('description, quantity, unit_price, total')
    .eq('invoice_id', inv.id)
    .order('sort_order')

  const logoDataUrl = business.logoUrl ? await fetchLogoDataUrl(business.logoUrl) : null

  const doc = buildPDFDoc(inv, lineItems ?? [], business, logoDataUrl)
  const blob = await pdf(doc).toBlob()

  const clientSlug = ((inv.customer as any)?.name ?? 'Client').replace(/\s+/g, '')
  const bizSlug = business.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${bizSlug}_Invoice_${inv.invoice_number}_${clientSlug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
