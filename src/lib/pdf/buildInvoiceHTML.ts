// NOTE: All colors hardcoded — CSS vars don't resolve in html2canvas context.
const DARK       = '#1d1c17'
const GOLD       = '#e6ab35'
const GOLD_DARK  = '#b8891f'
const HEADER_BG  = '#fffdf7'
const HEADER_BOR = '#e8dcc0'
const TEXT_BODY  = '#2a2018'
const TEXT_MUTED = '#7a6a5a'
const TEXT_SEC   = '#5c5240'
const SURFACE    = '#faf8f4'
const BORDER     = '#e0d5c0'
const GREEN      = '#1a7a3c'
const GREEN_BG   = '#eaf4ed'
const ALT_ROW    = '#f5f0ea'

export interface BusinessInfo {
  name: string
  phone?: string | null
  email?: string | null
  website?: string | null
  address?: string | null
  logoUrl?: string | null
}

type LineItem = { description: string; quantity: number | null; unit_price: number | null; total: number | null }

function fmtCurrency(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export function buildInvoiceHTML(
  inv: {
    invoice_number: string
    status: string
    total: number
    issue_date?: string | null
    due_date?: string | null
    payment_terms?: string | null
    paid_at?: string | null
    payment_method?: string | null
    payment_notes?: string | null
    notes?: string | null
    customer?: { id: string; name: string } | null
    project?: { id: string; title: string } | null
  },
  lineItems: LineItem[],
  business: BusinessInfo,
  logoDataUrl: string | null,
): string {
  const isPaid = inv.status === 'paid'
  const clientName = inv.customer?.name ?? '—'
  const footerBiz = [business.name, business.website].filter(Boolean).join(' · ')
  const contactParts = [business.phone, business.email, business.website].filter(Boolean)

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:56px;width:auto;max-width:160px;object-fit:contain;display:block;margin-bottom:8px;background:transparent;" />`
    : ''

  const paidStampHtml = isPaid
    ? `<div style="display:inline-block;background:${GREEN_BG};color:${GREEN};border:2px solid ${GREEN};border-radius:6px;padding:4px 14px;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-top:8px;">PAID</div>`
    : ''

  const invoiceDetailRows = [
    inv.issue_date ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${BORDER};font-size:11px;"><span style="color:${TEXT_MUTED};">Invoice Date</span><span style="color:${TEXT_BODY};font-weight:600;">${fmtDate(inv.issue_date)}</span></div>` : '',
    inv.due_date ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${BORDER};font-size:11px;"><span style="color:${TEXT_MUTED};">Due Date</span><span style="color:${isPaid ? GREEN : TEXT_BODY};font-weight:600;">${fmtDate(inv.due_date)}</span></div>` : '',
    inv.payment_terms ? `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid ${BORDER};font-size:11px;"><span style="color:${TEXT_MUTED};">Payment Terms</span><span style="color:${TEXT_BODY};font-weight:600;">${inv.payment_terms}</span></div>` : '',
    inv.paid_at ? `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;"><span style="color:${TEXT_MUTED};">Paid On</span><span style="color:${GREEN};font-weight:700;">${fmtDate(inv.paid_at)}</span></div>` : '',
  ].filter(Boolean).join('')

  const lineItemRows = lineItems.map((item, i) => {
    const bg = i % 2 === 1 ? ALT_ROW : '#ffffff'
    return `
      <tr style="background:${bg};">
        <td style="padding:9px 14px;font-size:11px;color:${TEXT_BODY};border-bottom:1px solid ${BORDER};">${item.description}</td>
        <td style="padding:9px 14px;font-size:11px;color:${TEXT_MUTED};text-align:center;border-bottom:1px solid ${BORDER};">${item.quantity ?? ''}</td>
        <td style="padding:9px 14px;font-size:11px;color:${TEXT_MUTED};text-align:right;border-bottom:1px solid ${BORDER};">${item.unit_price != null ? fmtCurrency(item.unit_price) : ''}</td>
        <td style="padding:9px 14px;font-size:11px;color:${TEXT_BODY};font-weight:700;text-align:right;border-bottom:1px solid ${BORDER};">${item.total != null ? fmtCurrency(item.total) : ''}</td>
      </tr>`
  }).join('')

  const payInstructionsHtml = !isPaid && (business.email || business.phone || business.website)
    ? `<div style="margin-top:20px;padding:14px 18px;background:#f5f0ea;border-left:3px solid ${GOLD};border-radius:6px;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:${GOLD_DARK};letter-spacing:0.10em;margin-bottom:8px;">Payment Instructions</div>
        ${business.email ? `<div style="font-size:11px;color:${TEXT_BODY};margin-bottom:4px;">Pay via Zelle or bank transfer to ${business.email}</div>` : ''}
        ${business.phone ? `<div style="font-size:11px;color:${TEXT_BODY};margin-bottom:4px;">Questions? Call or text ${business.phone}</div>` : ''}
        ${business.website ? `<div style="font-size:11px;color:${TEXT_BODY};">Online: ${business.website}</div>` : ''}
       </div>`
    : ''

  const notesHtml = inv.notes
    ? `<div style="margin-top:16px;padding:12px 16px;background:${SURFACE};border:1px solid ${BORDER};border-radius:6px;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:${TEXT_MUTED};letter-spacing:0.08em;margin-bottom:6px;">Notes</div>
        <div style="font-size:11px;color:${TEXT_BODY};line-height:1.6;">${inv.notes}</div>
       </div>`
    : ''

  return `
<div class="pdf-page" style="width:816px;height:1056px;background:#ffffff;font-family:Helvetica,Arial,sans-serif;position:relative;overflow:hidden;box-sizing:border-box;">
  <div style="padding:28px 36px 60px;">

    <!-- Cream header card -->
    <div style="background:${HEADER_BG};border:1px solid ${HEADER_BOR};border-radius:12px;padding:18px 22px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        ${logoHtml}
        <div style="font-size:18px;font-weight:800;color:${DARK};letter-spacing:-0.01em;">${business.name}</div>
        ${contactParts.length ? `<div style="font-size:10px;color:${TEXT_MUTED};margin-top:4px;line-height:1.7;">${contactParts.join(' · ')}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:${GOLD_DARK};letter-spacing:0.12em;margin-bottom:4px;">Invoice</div>
        <div style="font-size:30px;font-weight:800;color:${GOLD};line-height:1;">#${inv.invoice_number}</div>
        ${paidStampHtml}
      </div>
    </div>

    <!-- Gold rule -->
    <div style="height:2px;background:${GOLD};margin:16px 0;border-radius:1px;"></div>

    <!-- Bill To / Invoice Details -->
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;gap:24px;">
      <div style="flex:1;">
        <div style="font-size:9px;font-weight:800;text-transform:uppercase;color:${GOLD_DARK};letter-spacing:0.10em;margin-bottom:8px;">Bill To</div>
        <div style="font-size:16px;font-weight:700;color:${DARK};margin-bottom:4px;">${clientName}</div>
        ${inv.project?.title ? `<div style="font-size:12px;color:${TEXT_MUTED};">${inv.project.title}</div>` : ''}
      </div>
      <div style="width:260px;flex-shrink:0;">
        ${invoiceDetailRows}
      </div>
    </div>

    <!-- Thin rule -->
    <div style="height:1px;background:${BORDER};margin-bottom:16px;"></div>

    <!-- Line items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead>
        <tr style="background:${DARK};">
          <th style="padding:9px 14px;font-size:9px;font-weight:700;color:${GOLD};text-align:left;letter-spacing:0.06em;text-transform:uppercase;width:55%;">Description</th>
          <th style="padding:9px 14px;font-size:9px;font-weight:700;color:${GOLD};text-align:center;letter-spacing:0.06em;text-transform:uppercase;width:10%;">Qty</th>
          <th style="padding:9px 14px;font-size:9px;font-weight:700;color:${GOLD};text-align:right;letter-spacing:0.06em;text-transform:uppercase;width:17%;">Rate</th>
          <th style="padding:9px 14px;font-size:9px;font-weight:700;color:${GOLD};text-align:right;letter-spacing:0.06em;text-transform:uppercase;width:18%;">Amount</th>
        </tr>
      </thead>
      <tbody>${lineItemRows}</tbody>
    </table>

    <!-- Total bar -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
      <div style="background:${DARK};border-radius:8px;padding:12px 18px;display:flex;align-items:center;gap:24px;">
        <span style="font-size:12px;font-weight:700;color:#c8b090;">${isPaid ? 'Total Paid' : 'Balance Due'}</span>
        <span style="font-size:20px;font-weight:800;color:${GOLD};">${fmtCurrency(inv.total)}</span>
      </div>
    </div>

    ${payInstructionsHtml}
    ${notesHtml}
  </div>

  <!-- Footer -->
  <div style="position:absolute;bottom:20px;left:36px;right:36px;border-top:1px solid ${BORDER};padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:${TEXT_MUTED};">
    <span>${footerBiz || business.name}</span>
    <span style="color:#b8891f;font-weight:600;">Powered by Iker's</span>
  </div>
</div>`
}
