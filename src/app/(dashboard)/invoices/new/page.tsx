'use client'
import { useState, useRef } from 'react'
import { ArrowLeft, Download, Plus, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import { format } from 'date-fns'

interface InvoiceLineItem {
  id: string
  description: string
  qty: number | null
  unit: string
  rate: number | null
  amount: number | null
}

function genId() { return Math.random().toString(36).slice(2) }

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const DEFAULT_ITEMS: InvoiceLineItem[] = [
  { id: genId(), description: '', qty: 1, unit: '', rate: null, amount: null },
]

// ─── PDF ─────────────────────────────────────────────────────────────────────

const pdfStyles = StyleSheet.create({
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
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#6b7280', letterSpacing: 0.8, marginBottom: 6 },
  value: { fontSize: 10, color: '#1a1a1a', lineHeight: 1.6 },
  lineHeader: { flexDirection: 'row', backgroundColor: '#1d1c17', padding: '6 10' },
  lineHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#e6ab35' },
  lineRow: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb', padding: '6 10' },
  lineCell: { fontSize: 9 },
  totalsBox: { alignItems: 'flex-end', marginTop: 16 },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginBottom: 4 },
  totalsLabel: { fontSize: 9, color: '#6b7280', width: 100, textAlign: 'right' },
  totalsValue: { fontSize: 9, width: 80, textAlign: 'right' },
  balanceDue: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24, marginTop: 8, paddingTop: 8, borderTop: '1.5 solid #1d1c17' },
  balanceLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1d1c17', width: 100, textAlign: 'right' },
  balanceValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#e6ab35', width: 80, textAlign: 'right' },
  payBox: { marginTop: 24, padding: '12 16', backgroundColor: '#f9f9f7', border: '1 solid #e5e7eb', borderRadius: 4 },
  payTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', color: '#374151', letterSpacing: 0.8, marginBottom: 6 },
  payText: { fontSize: 9, color: '#374151', lineHeight: 1.6 },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, borderTop: '1 solid #e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
})

function buildInvoicePDF(inv: any) {
  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <View style={pdfStyles.darkHeader}>
          <View>
            <Text style={pdfStyles.logoText}>SkyGlobal</Text>
            <Text style={pdfStyles.logoSub}>SkyGlobal Renovations LLC</Text>
            <Text style={{ fontSize: 8, color: '#9a9585', marginTop: 8, lineHeight: 1.6 }}>
              352-782-2460 | 470-469-9961{'\n'}skyglobalsvcs@gmail.com{'\n'}skyglobalsvcs.com
            </Text>
          </View>
          <View>
            <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
            <Text style={pdfStyles.invoiceNum}>#{inv.invoiceNumber || 'INV-001'}</Text>
          </View>
        </View>

        <View style={pdfStyles.body}>
          <View style={pdfStyles.twoCol}>
            <View style={pdfStyles.billSection}>
              <Text style={pdfStyles.label}>Bill To</Text>
              <Text style={pdfStyles.value}>{inv.billToName || '—'}</Text>
              <Text style={pdfStyles.value}>{inv.billToAddress || ''}</Text>
              <Text style={pdfStyles.value}>{inv.billToPhone || ''}</Text>
              <Text style={pdfStyles.value}>{inv.billToEmail || ''}</Text>
            </View>
            <View style={pdfStyles.infoSection}>
              <Text style={pdfStyles.label}>Invoice Date</Text>
              <Text style={pdfStyles.value}>{inv.invoiceDate || '—'}</Text>
              <Text style={[pdfStyles.label, { marginTop: 10 }]}>Due Date</Text>
              <Text style={pdfStyles.value}>{inv.dueDate || '—'}</Text>
            </View>
          </View>

          {/* Line items */}
          <View style={pdfStyles.lineHeader}>
            <Text style={[pdfStyles.lineHeaderCell, { width: '45%' }]}>Description</Text>
            <Text style={[pdfStyles.lineHeaderCell, { width: '10%', textAlign: 'center' }]}>Qty</Text>
            <Text style={[pdfStyles.lineHeaderCell, { width: '15%' }]}>Unit</Text>
            <Text style={[pdfStyles.lineHeaderCell, { width: '15%', textAlign: 'right' }]}>Rate</Text>
            <Text style={[pdfStyles.lineHeaderCell, { width: '15%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {inv.items.map((item: InvoiceLineItem, i: number) => (
            <View key={item.id} style={[pdfStyles.lineRow, { backgroundColor: i % 2 === 0 ? '#f9f9f7' : '#fff' }]}>
              <Text style={[pdfStyles.lineCell, { width: '45%' }]}>{item.description || '—'}</Text>
              <Text style={[pdfStyles.lineCell, { width: '10%', textAlign: 'center' }]}>{item.qty ?? '—'}</Text>
              <Text style={[pdfStyles.lineCell, { width: '15%' }]}>{item.unit || '—'}</Text>
              <Text style={[pdfStyles.lineCell, { width: '15%', textAlign: 'right' }]}>{item.rate != null ? `$${fmt(item.rate)}` : '—'}</Text>
              <Text style={[pdfStyles.lineCell, { width: '15%', textAlign: 'right' }]}>{item.amount != null ? `$${fmt(item.amount)}` : '—'}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={pdfStyles.totalsBox}>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Subtotal</Text>
              <Text style={pdfStyles.totalsValue}>${fmt(inv.subtotal)}</Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Tax ({inv.taxPct}%)</Text>
              <Text style={pdfStyles.totalsValue}>${fmt(inv.taxAmt)}</Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={[pdfStyles.totalsLabel, { fontFamily: 'Helvetica-Bold', color: '#1a1a1a' }]}>Total</Text>
              <Text style={[pdfStyles.totalsValue, { fontFamily: 'Helvetica-Bold' }]}>${fmt(inv.total)}</Text>
            </View>
            <View style={pdfStyles.totalsRow}>
              <Text style={pdfStyles.totalsLabel}>Amount Paid</Text>
              <Text style={pdfStyles.totalsValue}>${fmt(inv.amountPaid)}</Text>
            </View>
            <View style={pdfStyles.balanceDue}>
              <Text style={pdfStyles.balanceLabel}>BALANCE DUE</Text>
              <Text style={pdfStyles.balanceValue}>${fmt(inv.balanceDue)}</Text>
            </View>
          </View>

          {/* Payment instructions */}
          <View style={pdfStyles.payBox}>
            <Text style={pdfStyles.payTitle}>Payment Instructions</Text>
            <Text style={pdfStyles.payText}>{inv.paymentInstructions}</Text>
          </View>

          {inv.notes && (
            <View style={{ marginTop: 16 }}>
              <Text style={pdfStyles.payTitle}>Notes</Text>
              <Text style={pdfStyles.payText}>{inv.notes}</Text>
            </View>
          )}
        </View>

        <View style={pdfStyles.footer}>
          <Text>SkyGlobal Renovations LLC · 5-Year Workmanship Warranty · Policy No. CEG-00312198-00</Text>
          <Text>skyglobalsvcs@gmail.com · 352-782-2460</Text>
        </View>
      </Page>
    </Document>
  )
}

// ─── EDITABLE CELL ───────────────────────────────────────────────────────────

function EditCell({ value, onChange, type = 'text', placeholder = '' }: { value: string | number | null; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'rgba(230,171,53,0.04)',
        border: 'none',
        borderBottom: '1px dashed rgba(230,171,53,0.4)',
        outline: 'none',
        width: '100%',
        fontFamily: 'Georgia, serif',
        fontSize: 13,
        color: '#1a1a1a',
        padding: '2px 4px',
      }}
      onFocus={e => { e.target.style.borderBottomColor = 'var(--sg-gold)'; e.target.style.background = 'rgba(230,171,53,0.08)' }}
      onBlur={e => { e.target.style.borderBottomColor = 'rgba(230,171,53,0.4)'; e.target.style.background = 'rgba(230,171,53,0.04)' }}
    />
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function InvoiceNewPage() {
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${format(new Date(), 'yyyyMMdd')}-001`)
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
  const [billToName, setBillToName] = useState('')
  const [billToAddress, setBillToAddress] = useState('')
  const [billToPhone, setBillToPhone] = useState('')
  const [billToEmail, setBillToEmail] = useState('')
  const [items, setItems] = useState<InvoiceLineItem[]>(DEFAULT_ITEMS)
  const [taxPct, setTaxPct] = useState(0)
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentInstructions, setPaymentInstructions] = useState(`Please make checks payable to SkyGlobal Renovations LLC\nZelle/Venmo: 352-782-2460\nCredit card payments subject to 3.9% processing fee.`)
  const [notes, setNotes] = useState('Thank you for choosing SkyGlobal Renovations!')
  const [pdfLoading, setPdfLoading] = useState(false)

  const updateItem = (id: string, field: keyof InvoiceLineItem, val: string | number | null) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: val }
      if (field === 'qty' || field === 'rate') {
        const q = field === 'qty' ? (val as number) : item.qty
        const r = field === 'rate' ? (val as number) : item.rate
        updated.amount = q != null && r != null ? parseFloat((q * r).toFixed(2)) : null
      }
      return updated
    }))
  }

  const addItem = () => setItems(prev => [...prev, { id: genId(), description: '', qty: 1, unit: '', rate: null, amount: null }])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  const subtotal = items.reduce((s, i) => s + (i.amount ?? 0), 0)
  const taxAmt = parseFloat((subtotal * (taxPct / 100)).toFixed(2))
  const total = subtotal + taxAmt
  const balanceDue = Math.max(0, total - amountPaid)

  const handleDownload = async () => {
    setPdfLoading(true)
    try {
      const invoiceData = { invoiceNumber, invoiceDate, dueDate, billToName, billToAddress, billToPhone, billToEmail, items, taxPct, taxAmt, subtotal, total, amountPaid, balanceDue, paymentInstructions, notes }
      const blob = await pdf(buildInvoicePDF(invoiceData)).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SkyGlobal-Invoice-${invoiceNumber}-${billToName.replace(/\s+/g, '') || 'Client'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Invoice downloaded')
    } catch {
      toast.error('PDF generation failed')
    } finally {
      setPdfLoading(false)
    }
  }

  const cellStyle: React.CSSProperties = { padding: '8px 10px', border: '1px solid #e5e7eb', verticalAlign: 'middle' }
  const thStyle: React.CSSProperties = { padding: '8px 10px', background: 'var(--sg-base)', color: 'var(--sg-gold)', fontSize: 11, fontWeight: 700, textAlign: 'left', letterSpacing: '0.04em' }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sg-base)', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--sg-surface)', borderBottom: '1px solid var(--sg-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/proposals" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sg-text-2)', fontSize: 13, textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Back
          </Link>
          <div style={{ width: 1, height: 24, background: 'var(--sg-border)' }} />
          <span style={{ background: 'var(--sg-sky)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>Invoice</span>
        </div>
        <button onClick={handleDownload} disabled={pdfLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--sg-gold)', border: 'none', borderRadius: 8, padding: '6px 16px', cursor: pdfLoading ? 'not-allowed' : 'pointer', color: '#000', fontSize: 13, fontWeight: 700, opacity: pdfLoading ? 0.7 : 1 }}>
          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {pdfLoading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Document */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 20px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 794, borderRadius: 2, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', overflow: 'hidden', fontFamily: 'Georgia, serif', color: '#1a1a1a' }}>
          {/* Dark header */}
          <div style={{ background: 'var(--sg-base)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--sg-gold)', letterSpacing: '-0.02em' }}>SkyGlobal</div>
              <div style={{ fontSize: 12, color: 'var(--sg-text-2)', marginTop: 2 }}>SkyGlobal Renovations LLC</div>
              <div style={{ fontSize: 11, color: 'var(--sg-text-2)', marginTop: 10, lineHeight: 1.8 }}>
                <div>352-782-2460 | 470-469-9961</div>
                <div>skyglobalsvcs@gmail.com</div>
                <div>skyglobalsvcs.com</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--sg-gold)', letterSpacing: '-0.02em' }}>INVOICE</div>
              <div>
                <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(230,171,53,0.5)', color: 'var(--sg-text-2)', fontSize: 13, textAlign: 'right', outline: 'none', fontFamily: 'Georgia, serif', width: 180 }} />
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '32px 40px' }}>
            {/* Bill To + Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 10, fontFamily: 'sans-serif' }}>Bill To</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <EditCell value={billToName} onChange={setBillToName} placeholder="Client Name" />
                  <EditCell value={billToAddress} onChange={setBillToAddress} placeholder="Address" />
                  <EditCell value={billToPhone} onChange={setBillToPhone} placeholder="Phone" />
                  <EditCell value={billToEmail} onChange={setBillToEmail} placeholder="Email" />
                </div>
              </div>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 8, fontFamily: 'sans-serif' }}>Invoice Date</div>
                    <EditCell value={invoiceDate} onChange={setInvoiceDate} type="date" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 8, fontFamily: 'sans-serif' }}>Due Date</div>
                    <EditCell value={dueDate} onChange={setDueDate} type="date" />
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '44%' }}>Description</th>
                  <th style={{ ...thStyle, width: '8%', textAlign: 'center' }}>Qty</th>
                  <th style={{ ...thStyle, width: '12%' }}>Unit</th>
                  <th style={{ ...thStyle, width: '16%', textAlign: 'right' }}>Rate</th>
                  <th style={{ ...thStyle, width: '16%', textAlign: 'right' }}>Amount</th>
                  <th style={{ ...thStyle, width: '4%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? '#f9f9f7' : '#fff' }}>
                    <td style={cellStyle}>
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Line item description..." style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: 'Georgia, serif', fontSize: 13 }} />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <input type="number" value={item.qty ?? ''} onChange={e => updateItem(item.id, 'qty', e.target.value ? parseFloat(e.target.value) : null)} style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: 'Georgia, serif', fontSize: 13, textAlign: 'center' }} placeholder="1" />
                    </td>
                    <td style={cellStyle}>
                      <input value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} placeholder="hr" style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontFamily: 'Georgia, serif', fontSize: 13 }} />
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                        <span style={{ color: '#6b7280', fontSize: 11 }}>$</span>
                        <input type="number" value={item.rate ?? ''} onChange={e => updateItem(item.id, 'rate', e.target.value ? parseFloat(e.target.value) : null)} style={{ background: 'transparent', border: 'none', outline: 'none', width: 80, fontFamily: 'Georgia, serif', fontSize: 13, textAlign: 'right' }} placeholder="0.00" />
                      </div>
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600 }}>
                      {item.amount != null ? `$${fmt(item.amount)}` : '—'}
                    </td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>
                      <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sg-danger)', padding: 2 }}><X size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px dashed var(--sg-sky)', borderRadius: 4, color: 'var(--sg-sky)', fontSize: 11, padding: '4px 12px', cursor: 'pointer', marginBottom: 32 }}>
              <Plus size={12} /> Add Line
            </button>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280 }}>
                {[
                  ['Subtotal', `$${fmt(subtotal)}`],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#6b7280' }}>{label}</span>
                    <span>{val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>Tax{' '}
                    <input type="number" value={taxPct} onChange={e => setTaxPct(parseFloat(e.target.value) || 0)} min={0} max={100} style={{ width: 36, background: 'rgba(230,171,53,0.07)', border: '1px solid var(--sg-gold)', borderRadius: 3, fontSize: 11, textAlign: 'center', padding: '1px 3px', outline: 'none', fontFamily: 'Georgia, serif' }} />%
                  </span>
                  <span>${fmt(taxAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, fontWeight: 700, borderBottom: '1px solid #f3f4f6' }}>
                  <span>Total</span>
                  <span>${fmt(total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>Amount Paid</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>$</span>
                    <input type="number" value={amountPaid} onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)} style={{ width: 90, background: 'rgba(230,171,53,0.07)', border: '1px solid var(--sg-gold)', borderRadius: 3, fontSize: 13, textAlign: 'right', padding: '2px 4px', outline: 'none', fontFamily: 'Georgia, serif' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 5px', fontSize: 18, fontWeight: 700, borderTop: '2px solid var(--sg-base)', marginTop: 4 }}>
                  <span>BALANCE DUE</span>
                  <span style={{ color: 'var(--sg-gold)' }}>${fmt(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div style={{ marginTop: 32, padding: '16px 18px', background: '#f9f9f7', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151', marginBottom: 8, fontFamily: 'sans-serif' }}>Payment Instructions</div>
              <textarea
                value={paymentInstructions}
                onChange={e => setPaymentInstructions(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'Georgia, serif', color: '#374151', lineHeight: 1.7, resize: 'vertical', minHeight: 80 }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6, fontFamily: 'sans-serif' }}>Notes</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px dashed rgba(230,171,53,0.4)', outline: 'none', fontSize: 13, fontFamily: 'Georgia, serif', color: '#374151', lineHeight: 1.7, resize: 'none' }}
                rows={2}
              />
            </div>

            {/* Footer */}
            <div style={{ marginTop: 40, paddingTop: 12, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', fontFamily: 'sans-serif' }}>
              <span>SkyGlobal Renovations LLC · 5-Year Workmanship Warranty · Policy No. CEG-00312198-00</span>
              <span>skyglobalsvcs@gmail.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
