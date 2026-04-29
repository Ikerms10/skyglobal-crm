'use client'
import { createClient } from '@/lib/supabase/client'
import { buildProposalPages } from '@/lib/pdf/buildProposalHTML'
import type { ProposalTemplate } from '@/types'

import type { BusinessInfo } from '@/lib/pdf/buildProposalHTML'
export type { BusinessInfo }

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

export async function downloadProposalPDF(
  template: ProposalTemplate,
  data: any,
  fileName: string,
  businessInfo?: BusinessInfo,
) {
  const biz: BusinessInfo = businessInfo ?? { name: 'Business' }

  const logoDataUrl = biz.logoUrl && !biz.logoUrl.startsWith('data:')
    ? await fetchLogoDataUrl(biz.logoUrl)
    : (biz.logoUrl ?? null)

  const pages = buildProposalPages(template, data, biz, logoDataUrl)

  // Inject pages off-screen so html2canvas can capture them
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;'
  container.innerHTML = pages.join('')
  document.body.appendChild(container)

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const pageDivs = container.querySelectorAll<HTMLElement>('.pdf-page')
    // jsPDF letter: 215.9mm × 279.4mm
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

    for (let i = 0; i < pageDivs.length; i++) {
      const canvas = await html2canvas(pageDivs[i], {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 816,
        height: 1056,
      })

      if (i > 0) doc.addPage('letter', 'portrait')
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      doc.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4)
    }

    doc.save(fileName)
  } finally {
    document.body.removeChild(container)
  }
}
