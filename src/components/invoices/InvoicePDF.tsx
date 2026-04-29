'use client'
import { createClient } from '@/lib/supabase/client'
import { buildInvoiceHTML } from '@/lib/pdf/buildInvoiceHTML'
import type { Invoice } from '@/types'

export type { BusinessInfo } from '@/lib/pdf/buildInvoiceHTML'
import type { BusinessInfo } from '@/lib/pdf/buildInvoiceHTML'

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    // Use the Supabase storage client so the anon key + auth headers are included.
    // Raw fetch() to Supabase Storage URLs fails CORS without those headers.
    // URL shape: https://{proj}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/?]+)\/(.+?)(?:\?.*)?$/)
    if (!match) return null
    const [, bucket, path] = match
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error || !data) return null
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(data)
    })
  } catch {
    return null
  }
}

export async function downloadInvoicePDF(inv: Invoice, business: BusinessInfo) {
  const supabase = createClient()
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('description, quantity, unit_price, total')
    .eq('invoice_id', inv.id)
    .order('sort_order')

  const logoDataUrl = business.logoUrl && !business.logoUrl.startsWith('data:')
    ? await fetchLogoDataUrl(business.logoUrl)
    : (business.logoUrl ?? null)

  const html = buildInvoiceHTML(inv, lineItems ?? [], business, logoDataUrl)

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const pageDiv = container.querySelector<HTMLElement>('.pdf-page')!
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

    const canvas = await html2canvas(pageDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 816,
      height: 1056,
    })

    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 215.9, 279.4)

    const clientSlug = (inv.customer?.name ?? 'Client').replace(/\s+/g, '')
    const bizSlug = business.name.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
    doc.save(`${bizSlug}_Invoice_${inv.invoice_number}_${clientSlug}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
