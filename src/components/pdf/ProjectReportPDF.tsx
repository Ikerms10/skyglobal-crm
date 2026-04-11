'use client'
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Image,
} from '@react-pdf/renderer'
import { useState } from 'react'

function fmt(n: number | null | undefined) {
  if (!n && n !== 0) return '$0.00'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '—'
  return new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function daysBetween(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(ms / 86400000)
}

const G = '#e6ab35'
const DARK = '#1d1c17'
const GRAY = '#666'
const LIGHT_GRAY = '#f4f4f4'

const s = StyleSheet.create({
  page: { padding: 0, fontFamily: 'Helvetica', fontSize: 10, color: DARK, backgroundColor: '#fff' },
  goldBar: { backgroundColor: G, height: 40, width: '100%' },
  darkBar: { backgroundColor: DARK, height: 32, width: '100%' },
  content: { padding: '24 40' },
  cover: { padding: '0 40 40' },
  coverCompany: { fontSize: 22, fontWeight: 'bold', color: DARK, marginTop: 32, marginBottom: 4 },
  coverTagline: { fontSize: 11, color: GRAY, marginBottom: 40 },
  coverReportLabel: { fontSize: 10, fontWeight: 'bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 },
  coverTitle: { fontSize: 28, fontWeight: 'bold', color: DARK, marginBottom: 8 },
  coverCustomer: { fontSize: 14, color: G, marginBottom: 4 },
  coverAddress: { fontSize: 11, color: GRAY, marginBottom: 40 },
  coverDivider: { borderTop: `1pt solid ${G}`, marginVertical: 24 },
  coverMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  coverMetaBlock: {},
  coverMetaLabel: { fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  coverMetaValue: { fontSize: 11, fontWeight: 'bold', color: DARK },
  coverFooter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  coverFooterText: { color: '#fff', fontSize: 9, textAlign: 'center', padding: '10 0' },
  sectionTitle: { fontSize: 9, fontWeight: 'bold', color: GRAY, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },
  table: { borderRadius: 4, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottom: `0.5pt solid #e8e8e8`, padding: '7 10' },
  tableRowAlt: { flexDirection: 'row', borderBottom: `0.5pt solid #e8e8e8`, padding: '7 10', backgroundColor: LIGHT_GRAY },
  tableLabel: { flex: 1.4, fontSize: 9, color: GRAY },
  tableValue: { flex: 2, fontSize: 10, fontWeight: 'bold', color: DARK },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', padding: '6 10', borderBottom: `0.5pt solid #e8e8e8` },
  finLabel: { fontSize: 10, color: DARK },
  finValue: { fontSize: 10, fontWeight: 'bold', color: DARK, textAlign: 'right' },
  finTotal: { flexDirection: 'row', justifyContent: 'space-between', padding: '8 10', backgroundColor: DARK, borderRadius: 3, marginTop: 4 },
  finTotalLabel: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  finTotalValue: { fontSize: 11, fontWeight: 'bold', color: G },
  finProfit: { flexDirection: 'row', justifyContent: 'space-between', padding: '7 10', backgroundColor: `rgba(230,171,53,0.12)`, borderRadius: 3, marginTop: 2 },
  liHeader: { flexDirection: 'row', backgroundColor: DARK, padding: '6 8', borderRadius: 3 },
  liHeaderText: { color: '#fff', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  liRow: { flexDirection: 'row', borderBottom: `0.5pt solid #e8e8e8`, padding: '6 8' },
  liCell: { fontSize: 9, color: DARK },
  noteBox: { backgroundColor: LIGHT_GRAY, borderRadius: 4, padding: 12, marginTop: 4 },
  noteText: { fontSize: 10, color: DARK, lineHeight: 1.5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem: { width: '48%', marginBottom: 12 },
  photoImg: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 4 },
  photoLabel: { fontSize: 9, color: GRAY, textAlign: 'center', marginTop: 4 },
  expRow: { flexDirection: 'row', borderBottom: `0.5pt solid #e8e8e8`, padding: '5 8' },
  expHeader: { flexDirection: 'row', backgroundColor: DARK, padding: '5 8', borderRadius: 3 },
  expHeaderText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTop: `0.5pt solid #e8e8e8`, paddingTop: 6 },
  footerText: { fontSize: 8, color: GRAY },
})

interface ReportData {
  project: any
  customer: any
  lineItems: any[]
  expenses: any[]
  photos: any[]
}

function Footer({ title, pageNum, totalPages }: { title: string; pageNum: number; totalPages: number }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>SkyGlobal Renovations</Text>
      <Text style={s.footerText}>Page {pageNum} of {totalPages}</Text>
      <Text style={s.footerText}>{title} · Completion Report</Text>
    </View>
  )
}

function ReportDocument({ data }: { data: ReportData }) {
  const { project, customer, lineItems, expenses, photos } = data

  const contractValue = project.contract_value ?? 0
  const leadCost = project.lead_cost ?? 0
  const expTotal = expenses.reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
  const totalCosts = leadCost + expTotal
  const profit = contractValue - totalCosts
  const margin = contractValue > 0 ? Math.round((profit / contractValue) * 100) : 0
  const balanceDue = Math.max(0, contractValue - (project.amount_paid ?? 0))
  const duration = daysBetween(project.start_date, project.end_date)
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const beforePhotos = photos.filter((p: any) => p.label === 'Before')
  const duringPhotos = photos.filter((p: any) => p.label === 'During')
  const afterPhotos = photos.filter((p: any) => p.label === 'After')

  const lineItemsTotal = lineItems.reduce((s: number, l: any) => s + (l.total ?? 0), 0)

  const catGroups = expenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] ?? 0) + (e.amount ?? 0)
    return acc
  }, {})

  const TOTAL_PAGES = photos.length > 0 ? 5 : 4

  return (
    <Document>
      {/* PAGE 1: COVER */}
      <Page size="LETTER" style={s.page}>
        <View style={s.goldBar} />
        <View style={s.cover}>
          <Text style={s.coverCompany}>SkyGlobal Renovations</Text>
          <Text style={s.coverTagline}>Professional Painting Services · skyglobalsvcs.com</Text>
          <Text style={s.coverReportLabel}>Project Completion Report</Text>
          <Text style={s.coverTitle}>{project.title}</Text>
          <Text style={s.coverCustomer}>{customer.name}</Text>
          {project.address && <Text style={s.coverAddress}>{project.address}</Text>}
          <View style={s.coverDivider} />
          <View style={s.coverMeta}>
            <View style={s.coverMetaBlock}>
              <Text style={s.coverMetaLabel}>Completed</Text>
              <Text style={s.coverMetaValue}>{fmtDate(project.end_date)}</Text>
            </View>
            <View style={s.coverMetaBlock}>
              <Text style={s.coverMetaLabel}>Contract Value</Text>
              <Text style={[s.coverMetaValue, { color: G }]}>{fmt(contractValue)}</Text>
            </View>
            <View style={s.coverMetaBlock}>
              <Text style={s.coverMetaLabel}>Report Generated</Text>
              <Text style={s.coverMetaValue}>{today}</Text>
            </View>
          </View>
        </View>
        <View style={[s.coverFooter, s.darkBar]}>
          <Text style={s.coverFooterText}>skyglobalsvcs.com · (407) 000-0000 · skyglobalsvcs@gmail.com</Text>
        </View>
      </Page>

      {/* PAGE 2: PROJECT OVERVIEW + FINANCIAL SUMMARY */}
      <Page size="LETTER" style={s.page}>
        <View style={[s.goldBar, { height: 8 }]} />
        <View style={s.content}>
          <Text style={s.sectionTitle}>Project Details</Text>
          <View style={s.table}>
            {[
              ['Project Title', project.title],
              ['Customer Name', customer.name],
              ['Customer Phone', customer.phone ?? '—'],
              ['Customer Email', customer.email ?? '—'],
              ['Project Address', project.address ?? '—'],
              ['Job Type', project.type ?? '—'],
              ['Start Date', fmtDate(project.start_date)],
              ['Completion Date', fmtDate(project.end_date)],
              ['Total Duration', duration != null ? `${duration} days` : '—'],
              ['Project Status', 'Completed ✓'],
            ].map(([label, value], i) => (
              <View key={label} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                <Text style={s.tableLabel}>{label}</Text>
                <Text style={s.tableValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Financial Summary</Text>
          <View>
            <View style={s.finRow}>
              <Text style={s.finLabel}>Contract Value</Text>
              <Text style={[s.finValue, { color: G }]}>{fmt(contractValue)}</Text>
            </View>
            {leadCost > 0 && (
              <View style={s.finRow}>
                <Text style={s.finLabel}>Lead Acquisition Cost</Text>
                <Text style={s.finValue}>{fmt(leadCost)}</Text>
              </View>
            )}
            <View style={[s.finRow, { backgroundColor: LIGHT_GRAY, marginTop: 6 }]}>
              <Text style={[s.finLabel, { fontWeight: 'bold', color: GRAY, textTransform: 'uppercase', fontSize: 8, letterSpacing: 1 }]}>Expenses Breakdown</Text>
              <Text style={s.finValue}></Text>
            </View>
            {Object.entries(catGroups).map(([cat, amt]) => (
              <View key={cat} style={s.finRow}>
                <Text style={[s.finLabel, { paddingLeft: 10 }]}>{cat}</Text>
                <Text style={s.finValue}>{fmt(amt as number)}</Text>
              </View>
            ))}
            <View style={[s.finRow, { borderTop: `1pt solid ${G}`, marginTop: 4 }]}>
              <Text style={[s.finLabel, { fontWeight: 'bold' }]}>Total Project Costs</Text>
              <Text style={[s.finValue, { color: '#ff453a' }]}>{fmt(totalCosts)}</Text>
            </View>
            <View style={s.finProfit}>
              <Text style={[s.finLabel, { fontWeight: 'bold', color: G }]}>Gross Profit</Text>
              <Text style={[s.finValue, { color: G }]}>{fmt(profit)}</Text>
            </View>
            <View style={[s.finRow, { borderBottom: 'none' }]}>
              <Text style={[s.finLabel, { color: GRAY }]}>Profit Margin</Text>
              <Text style={[s.finValue, { color: profit >= 0 ? '#30d158' : '#ff453a' }]}>{margin}%</Text>
            </View>
            <View style={s.finTotal}>
              <Text style={s.finTotalLabel}>Amount Paid</Text>
              <Text style={s.finTotalValue}>{fmt(project.amount_paid)}</Text>
            </View>
            <View style={[s.finRow, { justifyContent: 'space-between' }]}>
              <Text style={[s.finLabel, { fontWeight: 'bold' }]}>Balance Due</Text>
              <Text style={[s.finValue, { color: balanceDue > 0 ? '#ff453a' : '#30d158' }]}>{fmt(balanceDue)}</Text>
            </View>
          </View>
        </View>
        <Footer title={project.title} pageNum={2} totalPages={TOTAL_PAGES} />
      </Page>

      {/* PAGE 3: SCOPE OF WORK + NOTES + MANAGEMENT */}
      <Page size="LETTER" style={s.page}>
        <View style={[s.goldBar, { height: 8 }]} />
        <View style={s.content}>
          <Text style={s.sectionTitle}>Scope of Work Completed</Text>
          {lineItems.length > 0 ? (
            <>
              <View style={s.liHeader}>
                <Text style={[s.liHeaderText, { flex: 0.3 }]}>#</Text>
                <Text style={[s.liHeaderText, { flex: 3 }]}>Description</Text>
                <Text style={[s.liHeaderText, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                <Text style={[s.liHeaderText, { flex: 0.8, textAlign: 'center' }]}>Unit</Text>
                <Text style={[s.liHeaderText, { flex: 1, textAlign: 'right' }]}>Price</Text>
                <Text style={[s.liHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>
              {lineItems.map((li: any, i: number) => (
                <View key={li.id} style={[s.liRow, { backgroundColor: i % 2 === 0 ? '#fff' : LIGHT_GRAY }]}>
                  <Text style={[s.liCell, { flex: 0.3, color: GRAY }]}>{i + 1}</Text>
                  <Text style={[s.liCell, { flex: 3 }]}>{li.description}</Text>
                  <Text style={[s.liCell, { flex: 0.8, textAlign: 'center' }]}>{li.quantity ?? '—'}</Text>
                  <Text style={[s.liCell, { flex: 0.8, textAlign: 'center' }]}>{li.unit ?? '—'}</Text>
                  <Text style={[s.liCell, { flex: 1, textAlign: 'right' }]}>{fmt(li.unit_price)}</Text>
                  <Text style={[s.liCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{fmt(li.total)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: '8 8', borderTop: `1pt solid ${G}` }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: DARK, marginRight: 8 }}>TOTAL</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: G }}>{fmt(lineItemsTotal)}</Text>
              </View>
            </>
          ) : (
            <Text style={{ fontSize: 10, color: GRAY }}>No line items recorded.</Text>
          )}

          {(project.description || project.notes) && (
            <>
              <Text style={s.sectionTitle}>Project Notes</Text>
              <View style={s.noteBox}>
                {project.description && <Text style={s.noteText}>{project.description}</Text>}
                {project.notes && <Text style={[s.noteText, { marginTop: 8 }]}>{project.notes}</Text>}
              </View>
            </>
          )}

          {(project.paint_brand || project.paint_colors || project.crew_notes) && (
            <>
              <Text style={s.sectionTitle}>Management Notes</Text>
              <View style={s.table}>
                {project.paint_brand && (
                  <View style={s.tableRow}>
                    <Text style={s.tableLabel}>Paint Brand</Text>
                    <Text style={s.tableValue}>{project.paint_brand}</Text>
                  </View>
                )}
                {project.paint_colors && (
                  <View style={s.tableRowAlt}>
                    <Text style={s.tableLabel}>Colors</Text>
                    <Text style={s.tableValue}>{project.paint_colors}</Text>
                  </View>
                )}
                {project.num_coats && (
                  <View style={s.tableRow}>
                    <Text style={s.tableLabel}>Coats</Text>
                    <Text style={s.tableValue}>{project.num_coats}</Text>
                  </View>
                )}
                {project.primer_used != null && (
                  <View style={s.tableRowAlt}>
                    <Text style={s.tableLabel}>Primer Used</Text>
                    <Text style={s.tableValue}>{project.primer_used ? 'Yes' : 'No'}</Text>
                  </View>
                )}
                {project.special_finishes && (
                  <View style={s.tableRow}>
                    <Text style={s.tableLabel}>Special Finishes</Text>
                    <Text style={s.tableValue}>{project.special_finishes}</Text>
                  </View>
                )}
                {project.crew_notes && (
                  <View style={s.tableRowAlt}>
                    <Text style={s.tableLabel}>Crew Notes</Text>
                    <Text style={s.tableValue}>{project.crew_notes}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
        <Footer title={project.title} pageNum={3} totalPages={TOTAL_PAGES} />
      </Page>

      {/* PAGE 4: PHOTOS */}
      <Page size="LETTER" style={s.page}>
        <View style={[s.goldBar, { height: 8 }]} />
        <View style={s.content}>
          <Text style={s.sectionTitle}>Project Photos</Text>

          {(['Before', 'During', 'After'] as const).map(label => {
            const group = photos.filter((p: any) => p.label === label)
            return (
              <View key={label} style={{ marginBottom: 16 }}>
                <Text style={[s.sectionTitle, { marginTop: 8 }]}>{label} Photos</Text>
                {group.length === 0 ? (
                  <Text style={{ fontSize: 9, color: GRAY }}>No {label.toLowerCase()} photos recorded.</Text>
                ) : (
                  <View style={s.photoGrid}>
                    {group.map((p: any) => (
                      <View key={p.id} style={s.photoItem}>
                        <Image src={p.url} style={s.photoImg} />
                        <Text style={s.photoLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
        </View>
        <Footer title={project.title} pageNum={4} totalPages={TOTAL_PAGES} />
      </Page>

      {/* PAGE 5: EXPENSE DETAIL */}
      <Page size="LETTER" style={s.page}>
        <View style={[s.goldBar, { height: 8 }]} />
        <View style={s.content}>
          <Text style={s.sectionTitle}>Detailed Expense Log</Text>
          {expenses.length === 0 ? (
            <Text style={{ fontSize: 10, color: GRAY }}>No expenses recorded.</Text>
          ) : (
            <>
              <View style={s.expHeader}>
                <Text style={[s.expHeaderText, { flex: 1 }]}>Date</Text>
                <Text style={[s.expHeaderText, { flex: 1 }]}>Category</Text>
                <Text style={[s.expHeaderText, { flex: 2 }]}>Description</Text>
                <Text style={[s.expHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
              </View>
              {[...expenses].sort((a: any, b: any) => a.date?.localeCompare(b.date ?? '') ?? 0).map((e: any, i: number) => (
                <View key={e.id} style={[s.expRow, { backgroundColor: i % 2 === 0 ? '#fff' : LIGHT_GRAY }]}>
                  <Text style={[s.liCell, { flex: 1 }]}>{e.date ?? '—'}</Text>
                  <Text style={[s.liCell, { flex: 1 }]}>{e.category}</Text>
                  <Text style={[s.liCell, { flex: 2, color: GRAY }]}>{e.description ?? '—'}</Text>
                  <Text style={[s.liCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>{fmt(e.amount)}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: '8 8', borderTop: `1pt solid ${G}`, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', marginRight: 8 }}>Grand Total</Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: G }}>{fmt(expTotal)}</Text>
              </View>
            </>
          )}
        </View>
        <Footer title={project.title} pageNum={5} totalPages={TOTAL_PAGES} />
      </Page>
    </Document>
  )
}

export function DownloadProjectReportButton({ data }: { data: ReportData }) {
  const [ready, setReady] = useState(false)
  const customer = data.customer ?? {}
  const filename = `SkyGlobal-Report-${(customer.name ?? 'Project').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`

  return (
    <PDFDownloadLink
      document={<ReportDocument data={data} />}
      fileName={filename}
      onLoadingComplete={() => setReady(true)}
      style={{ textDecoration: 'none' }}
    >
      {({ loading }) => (
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border-card)',
            background: 'var(--bg-elevated)', cursor: loading ? 'wait' : 'pointer',
            fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)',
          }}
        >
          📄 {loading ? 'Generating…' : 'Project Report'}
        </button>
      )}
    </PDFDownloadLink>
  )
}
