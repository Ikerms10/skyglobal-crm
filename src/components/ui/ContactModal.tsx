'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MessageSquare, Mail } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'sms' | 'email'

export interface ContactModalProps {
  open: boolean
  onClose: () => void
  name: string
  phone?: string | null
  email?: string | null
  status?: string
  address?: string | null
  amount?: number | null
  resourceType: 'lead' | 'project'
  resourceId: string
}

// ─── Template definitions ─────────────────────────────────────────────────────

interface SmsTemplate {
  label: string
  buildBody: (vars: TemplateVars) => string
  buildSubject?: never
}

interface EmailTemplate {
  label: string
  buildSubject: (vars: TemplateVars) => string
  buildBody: (vars: TemplateVars) => string
}

interface TemplateVars {
  name: string
  address: string
  amount: string
  date: string
}

const SMS_TEMPLATES: SmsTemplate[] = [
  {
    label: 'Initial Outreach',
    buildBody: ({ name }) =>
      `Hi ${name}! This is Iker from SkyGlobal Renovations. I saw your request and wanted to personally reach out. I'd love to give you a free estimate — are you available for a quick call or site visit this week? 📞 352-782-2460`,
  },
  {
    label: 'Proposal Follow-Up',
    buildBody: ({ name, address }) =>
      `Hi ${name}, just following up on the proposal I sent over for ${address}. Happy to answer any questions or adjust anything. Looking forward to working with you! — Iker, SkyGlobal Renovations 🎨`,
  },
  {
    label: 'Check-In',
    buildBody: ({ name }) =>
      `Hi ${name}! Wanted to check in — did you get a chance to review the proposal? No pressure at all, just want to make sure you have everything you need. Give me a call anytime: 352-782-2460 — Iker`,
  },
  {
    label: 'Job Confirmation',
    buildBody: ({ name, address, date }) =>
      `Hi ${name}! Excited to confirm we're all set for your project at ${address}. We'll be there on ${date}. Please don't hesitate to reach out with any questions. See you soon! — SkyGlobal Renovations 🏠✨`,
  },
  {
    label: 'Custom',
    buildBody: () => '',
  },
]

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    label: 'Initial Outreach',
    buildSubject: ({ name }) => `Free Estimate for ${name} — SkyGlobal Renovations`,
    buildBody: ({ name }) =>
      `Hi ${name},\n\nThank you for reaching out! I'm Iker from SkyGlobal Renovations, and I'd love to help you with your painting project.\n\nI'd like to schedule a free, no-obligation estimate at your convenience. Please reply to this email or call me at 352-782-2460.\n\nLooking forward to hearing from you!\n\nBest,\nIker\nSkyGlobal Renovations`,
  },
  {
    label: 'Proposal Follow-Up',
    buildSubject: ({ name }) => `Following Up on Your Proposal — ${name}`,
    buildBody: ({ name, address }) =>
      `Hi ${name},\n\nI wanted to follow up on the proposal I sent over for ${address}. I'm happy to answer any questions or make adjustments to better fit your needs.\n\nFeel free to reply here or call me directly at 352-782-2460.\n\nBest,\nIker\nSkyGlobal Renovations`,
  },
  {
    label: 'Job Confirmation',
    buildSubject: ({ name }) => `Project Confirmed — SkyGlobal Renovations`,
    buildBody: ({ name, address, date }) =>
      `Hi ${name},\n\nWe're excited to confirm your project at ${address} is scheduled for ${date}.\n\nOur crew will arrive as planned. Please don't hesitate to reach out if you have any questions before we get started.\n\nSee you soon!\n\nIker\nSkyGlobal Renovations\n📞 352-782-2460`,
  },
  {
    label: 'Custom',
    buildSubject: () => '',
    buildBody: () => '',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTemplateVars(
  name: string,
  address: string | null | undefined,
  amount: number | null | undefined
): TemplateVars {
  return {
    name,
    address: address ?? 'your property',
    amount: amount != null ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00',
    date: format(new Date(), 'MMM d, yyyy'),
  }
}

function pickDefaultSmsTemplateIndex(status: string | undefined): number {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s === 'estimate sent') return 1
  if (s === 'follow-up' || s === 'follow up') return 2
  if (s === 'won' || s === 'in progress') return 3
  return 0
}

function pickDefaultEmailTemplateIndex(status: string | undefined): number {
  if (!status) return 0
  const s = status.toLowerCase()
  if (s === 'estimate sent' || s === 'follow-up' || s === 'follow up') return 1
  if (s === 'won' || s === 'in progress') return 2
  return 0
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--c-nested)',
  border: '1px solid var(--c-border)',
  color: 'var(--c-text-1)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 16,
  minHeight: 44,
  outline: 'none',
  fontFamily: 'var(--font-body)',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--c-text-3)',
  marginBottom: 6,
  fontFamily: 'var(--font-body)',
}

const fieldStyle: React.CSSProperties = { marginBottom: 16 }

// ─── SMS Tab ──────────────────────────────────────────────────────────────────

interface SmsTabProps {
  name: string
  phone: string | null | undefined
  status: string | undefined
  address: string | null | undefined
  amount: number | null | undefined
  resourceType: 'lead' | 'project'
  resourceId: string
  onLogSent: (type: 'Text', content: string) => Promise<void>
}

function SmsTab({
  name,
  phone: initialPhone,
  status,
  address,
  amount,
  onLogSent,
}: SmsTabProps) {
  const vars = buildTemplateVars(name, address, amount)
  const defaultIdx = pickDefaultSmsTemplateIndex(status)

  const [phoneValue, setPhoneValue] = useState(initialPhone ?? '')
  const [templateIdx, setTemplateIdx] = useState(defaultIdx)
  const [message, setMessage] = useState(() => SMS_TEMPLATES[defaultIdx].buildBody(vars))
  const [logAsSent, setLogAsSent] = useState(true)
  const [sending, setSending] = useState(false)

  // Rebuild message when template changes
  const handleTemplateChange = (idx: number) => {
    setTemplateIdx(idx)
    setMessage(SMS_TEMPLATES[idx].buildBody(vars))
  }

  const handleOpen = async () => {
    if (!phoneValue) {
      toast.error('Phone number is required')
      return
    }
    const smsUrl = `sms:${phoneValue}&body=${encodeURIComponent(message)}`
    window.open(smsUrl)

    if (logAsSent) {
      setSending(true)
      try {
        await onLogSent('Text', `SMS sent to ${phoneValue}: "${message}"`)
        toast.success('Logged as sent')
      } catch {
        toast.error('Failed to log activity')
      } finally {
        setSending(false)
      }
    }
  }

  return (
    <div>
      <div style={fieldStyle}>
        <label htmlFor="sms-phone" style={labelStyle}>
          Phone Number
        </label>
        <input
          id="sms-phone"
          type="tel"
          value={phoneValue}
          onChange={e => setPhoneValue(e.target.value)}
          placeholder="(555) 000-0000"
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sms-template" style={labelStyle}>
          Template
        </label>
        <select
          id="sms-template"
          value={templateIdx}
          onChange={e => handleTemplateChange(Number(e.target.value))}
          style={inputStyle}
        >
          {SMS_TEMPLATES.map((t, i) => (
            <option key={t.label} value={i}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="sms-message" style={labelStyle}>
          Message
        </label>
        <textarea
          id="sms-message"
          rows={5}
          value={message}
          onChange={e => setMessage(e.target.value)}
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical', height: 'auto' }}
        />
        <p
          style={{
            fontSize: 11,
            color: 'var(--c-text-4)',
            marginTop: 4,
            fontFamily: 'var(--font-body)',
          }}
        >
          {message.length} characters
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <input
          id="sms-log"
          type="checkbox"
          checked={logAsSent}
          onChange={e => setLogAsSent(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--c-gold)', cursor: 'pointer' }}
        />
        <label
          htmlFor="sms-log"
          style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}
        >
          Log as sent
        </label>
      </div>

      <button
        onClick={handleOpen}
        disabled={sending}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: 44,
          background: '#3583b3',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 700,
          cursor: sending ? 'not-allowed' : 'pointer',
          opacity: sending ? 0.6 : 1,
        }}
      >
        <MessageSquare size={16} aria-hidden="true" />
        Open in Messages
      </button>
    </div>
  )
}

// ─── Email Tab ────────────────────────────────────────────────────────────────

interface EmailTabProps {
  name: string
  email: string | null | undefined
  status: string | undefined
  address: string | null | undefined
  amount: number | null | undefined
  resourceType: 'lead' | 'project'
  resourceId: string
  onLogSent: (type: 'Email', content: string) => Promise<void>
}

function EmailTab({
  name,
  email: initialEmail,
  status,
  address,
  amount,
  onLogSent,
}: EmailTabProps) {
  const vars = buildTemplateVars(name, address, amount)
  const defaultIdx = pickDefaultEmailTemplateIndex(status)

  const [emailValue, setEmailValue] = useState(initialEmail ?? '')
  const [templateIdx, setTemplateIdx] = useState(defaultIdx)
  const [subject, setSubject] = useState(() => EMAIL_TEMPLATES[defaultIdx].buildSubject(vars))
  const [body, setBody] = useState(() => EMAIL_TEMPLATES[defaultIdx].buildBody(vars))
  const [logAsSent, setLogAsSent] = useState(true)
  const [sending, setSending] = useState(false)

  const handleTemplateChange = (idx: number) => {
    setTemplateIdx(idx)
    setSubject(EMAIL_TEMPLATES[idx].buildSubject(vars))
    setBody(EMAIL_TEMPLATES[idx].buildBody(vars))
  }

  const handleOpen = async () => {
    if (!emailValue) {
      toast.error('Email address is required')
      return
    }
    const mailtoUrl = `mailto:${emailValue}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)

    if (logAsSent) {
      setSending(true)
      try {
        await onLogSent('Email', `Email sent to ${emailValue}: "${subject}"`)
        toast.success('Logged as sent')
      } catch {
        toast.error('Failed to log activity')
      } finally {
        setSending(false)
      }
    }
  }

  return (
    <div>
      <div style={fieldStyle}>
        <label htmlFor="email-to" style={labelStyle}>
          To
        </label>
        <input
          id="email-to"
          type="email"
          value={emailValue}
          onChange={e => setEmailValue(e.target.value)}
          placeholder="customer@example.com"
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="email-template" style={labelStyle}>
          Template
        </label>
        <select
          id="email-template"
          value={templateIdx}
          onChange={e => handleTemplateChange(Number(e.target.value))}
          style={inputStyle}
        >
          {EMAIL_TEMPLATES.map((t, i) => (
            <option key={t.label} value={i}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="email-subject" style={labelStyle}>
          Subject
        </label>
        <input
          id="email-subject"
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={fieldStyle}>
        <label htmlFor="email-body" style={labelStyle}>
          Body
        </label>
        <textarea
          id="email-body"
          rows={6}
          value={body}
          onChange={e => setBody(e.target.value)}
          style={{ ...inputStyle, minHeight: 144, resize: 'vertical', height: 'auto' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <input
          id="email-log"
          type="checkbox"
          checked={logAsSent}
          onChange={e => setLogAsSent(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: 'var(--c-gold)', cursor: 'pointer' }}
        />
        <label
          htmlFor="email-log"
          style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}
        >
          Log as sent
        </label>
      </div>

      <button
        onClick={handleOpen}
        disabled={sending}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: 44,
          background: 'var(--c-gold)',
          color: 'var(--c-text-on-gold)',
          border: 'none',
          borderRadius: 8,
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 700,
          cursor: sending ? 'not-allowed' : 'pointer',
          opacity: sending ? 0.6 : 1,
        }}
      >
        <Mail size={16} aria-hidden="true" />
        Open in Mail
      </button>
    </div>
  )
}

// ─── ContactModal (main export) ───────────────────────────────────────────────

export function ContactModal({
  open,
  onClose,
  name,
  phone,
  email,
  status,
  address,
  amount,
  resourceType,
  resourceId,
}: ContactModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('sms')
  const queryClient = useQueryClient()

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, handleEscape])

  const logActivity = async (type: 'Text' | 'Email', content: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const payload: Record<string, unknown> = {
      user_id: user.id,
      type,
      content,
    }
    if (resourceType === 'lead') payload.lead_id = resourceId
    if (resourceType === 'project') payload.project_id = resourceId

    const { error } = await supabase.from('activities').insert(payload)
    if (error) throw error

    queryClient.invalidateQueries({ queryKey: ['activities'] })
  }

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid var(--c-border)',
    flexShrink: 0,
  }

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 0',
    fontSize: 13,
    fontWeight: isActive ? 700 : 500,
    color: isActive ? 'var(--c-text-1)' : 'var(--c-text-4)',
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--c-gold)' : '2px solid transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'color 150ms, border-color 150ms',
    marginBottom: -1,
  })

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-modal-title"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 480,
              maxHeight: '90dvh',
              background: 'var(--c-card)',
              border: '1px solid var(--c-border)',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              boxShadow: 'var(--s-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            className="md:rounded-xl md:mb-6"
          >
            {/* Gold accent line */}
            <div
              aria-hidden="true"
              style={{
                height: 2,
                background: 'linear-gradient(90deg, transparent, var(--c-gold), transparent)',
                flexShrink: 0,
              }}
            />

            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 12px',
                borderBottom: '1px solid var(--c-border)',
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  id="contact-modal-title"
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--c-text-1)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Contact {name}
                </h2>
                {status && (
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 12,
                      color: 'var(--c-text-4)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {status}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--c-border)',
                  color: 'var(--c-text-4)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Tab bar */}
            <div style={tabBarStyle} role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'sms'}
                aria-controls="contact-panel-sms"
                onClick={() => setActiveTab('sms')}
                style={tabStyle(activeTab === 'sms')}
              >
                <MessageSquare size={14} aria-hidden="true" />
                SMS
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'email'}
                aria-controls="contact-panel-email"
                onClick={() => setActiveTab('email')}
                style={tabStyle(activeTab === 'email')}
              >
                <Mail size={14} aria-hidden="true" />
                Email
              </button>
            </div>

            {/* Tab panels */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              {activeTab === 'sms' && (
                <div id="contact-panel-sms" role="tabpanel">
                  <SmsTab
                    name={name}
                    phone={phone}
                    status={status}
                    address={address}
                    amount={amount}
                    resourceType={resourceType}
                    resourceId={resourceId}
                    onLogSent={logActivity}
                  />
                </div>
              )}
              {activeTab === 'email' && (
                <div id="contact-panel-email" role="tabpanel">
                  <EmailTab
                    name={name}
                    email={email}
                    status={status}
                    address={address}
                    amount={amount}
                    resourceType={resourceType}
                    resourceId={resourceId}
                    onLogSent={logActivity}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
