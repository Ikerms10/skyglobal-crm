'use client'
import { useState } from 'react'
import { Modal } from './Modal'

interface Template {
  name: string
  body: string
}

const TEMPLATES: Template[] = [
  {
    name: 'Follow-up After Estimate',
    body: "Hi [Name]! This is SkyGlobal Renovations following up on the painting estimate we sent. Do you have any questions? We'd love to get your project scheduled!",
  },
  {
    name: 'Appointment Confirmation',
    body: 'Hi [Name]! Confirming your painting appointment for [Date]. Our crew will arrive between [Time]. Please ensure access to the property. Thank you!',
  },
  {
    name: 'Job Starting Tomorrow',
    body: "Hi [Name]! Just a reminder that our crew will start your painting project tomorrow. We're excited to transform your space! Any questions? Reply here.",
  },
  {
    name: 'Job Completed',
    body: "Hi [Name]! Your painting project is complete! It was a pleasure working with you. If you're happy with the results, we'd love a 5-star review on Google or Thumbtack!",
  },
  {
    name: 'Payment Reminder',
    body: "Hi [Name]! Hope you're loving the new paint! Just a friendly reminder that the remaining balance of $[Amount] is due. You can pay by [payment method]. Thank you!",
  },
  {
    name: 'Referral Request',
    body: "Hi [Name]! Thank you for choosing SkyGlobal! If you know anyone who needs painting services, we'd appreciate the referral. We offer a discount for referrals that book with us!",
  },
]

interface TextTemplatesModalProps {
  open: boolean
  onClose: () => void
  customerName?: string
  customerPhone?: string
}

export function TextTemplatesModal({ open, onClose, customerName = '', customerPhone }: TextTemplatesModalProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const fill = (body: string) => customerName ? body.replace(/\[Name\]/g, customerName) : body

  const handleCopy = async (template: Template) => {
    const text = fill(template.body)
    await navigator.clipboard.writeText(text)
    setCopied(template.name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="💬 Text Templates" size="lg">
      <div className="space-y-3">
        {TEMPLATES.map(t => {
          const filledBody = fill(t.body)
          const smsHref = customerPhone
            ? `sms:${customerPhone}?body=${encodeURIComponent(filledBody)}`
            : null
          return (
            <div key={t.name} className="bg-[#1d1c17] border border-[#2e2d26] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#e6ab35] uppercase tracking-wider mb-1">{t.name}</p>
              <p className="text-sm text-[#9a9585] mb-3 leading-relaxed">{filledBody}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCopy(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    copied === t.name
                      ? 'bg-[#10b981] text-white'
                      : 'bg-[#252419] border border-[#2e2d26] text-[#efeae2] hover:bg-[#2e2d26]'
                  }`}
                >
                  {copied === t.name ? '✓ Copied!' : 'Copy'}
                </button>
                {smsHref && (
                  <a
                    href={smsHref}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#3583b3] text-white hover:bg-[#2a6d96] transition-colors"
                  >
                    Open in Messages →
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
