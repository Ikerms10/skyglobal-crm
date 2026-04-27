'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  Target,
  FolderOpen,
  FileText,
  CreditCard,
  StickyNote,
  X,
  DollarSign,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { createClient } from '@/lib/supabase/client'

// ─── Action config ────────────────────────────────────────────────────────────

type ActionKey = 'lead' | 'project' | 'proposal' | 'expense' | 'note'

interface ActionConfig {
  key: ActionKey
  label: string
  icon: React.ReactNode
  color: string
  shadowColor: string
}

const ACTIONS: ActionConfig[] = [
  {
    key: 'lead',
    label: 'New Lead',
    icon: <Target size={18} />,
    color: '#3583b3',
    shadowColor: 'rgba(53,131,179,0.4)',
  },
  {
    key: 'project',
    label: 'New Project',
    icon: <FolderOpen size={18} />,
    color: '#e6ab35',
    shadowColor: 'rgba(230,171,53,0.4)',
  },
  {
    key: 'proposal',
    label: 'New Proposal',
    icon: <FileText size={18} />,
    color: '#4A6741',
    shadowColor: 'rgba(74,103,65,0.4)',
  },
  {
    key: 'expense',
    label: 'Log Expense',
    icon: <CreditCard size={18} />,
    color: '#A07850',
    shadowColor: 'rgba(160,120,80,0.4)',
  },
  {
    key: 'note',
    label: 'Add Note',
    icon: <StickyNote size={18} />,
    color: 'var(--c-text-3)',
    shadowColor: 'rgba(92,82,64,0.25)',
  },
]

// ─── Shared input/select/label styles ────────────────────────────────────────

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

const fieldStyle: React.CSSProperties = {
  marginBottom: 16,
}

// ─── Prefix-wrapped number input ──────────────────────────────────────────────

function PrefixInput({
  value,
  onChange,
  placeholder,
  id,
  required,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  id?: string
  required?: boolean
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span
        style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--c-text-4)',
          fontSize: 15,
          pointerEvents: 'none',
          fontFamily: 'var(--font-mono)',
        }}
        aria-hidden="true"
      >
        <DollarSign size={14} />
      </span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '0.00'}
        style={{ ...inputStyle, paddingLeft: 32 }}
      />
    </div>
  )
}

// ─── Save button ─────────────────────────────────────────────────────────────

function SaveButton({ loading, label = 'Save' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
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
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'opacity 150ms, transform 150ms',
        marginTop: 4,
      }}
    >
      {loading ? 'Saving…' : label}
    </button>
  )
}

// ─── Slide-up modal wrapper ───────────────────────────────────────────────────

interface SlideModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function SlideModal({ open, onClose, title, children }: SlideModalProps) {
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
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
            }}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fab-modal-title"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
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
            // NOTE: On desktop we center vertically; border-radius changes via media query
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
              <h2
                id="fab-modal-title"
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--c-text-1)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {title}
              </h2>
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
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── NEW LEAD MODAL ───────────────────────────────────────────────────────────

function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('Thumbtack')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClose = () => {
    setName('')
    setPhone('')
    setSource('Thumbtack')
    setEstimatedValue('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('leads').insert({
        user_id: user.id,
        title: name,
        source,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        stage: 'New Lead',
        notes: null,
      })
      if (error) throw error

      toast.success('Lead added')
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      handleClose()
    } catch (err) {
      toast.error('Failed to add lead')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlideModal open={open} onClose={handleClose} title="New Lead">
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label htmlFor="lead-name" style={labelStyle}>
            Full Name *
          </label>
          <input
            id="lead-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="lead-phone" style={labelStyle}>
            Phone Number
          </label>
          <input
            id="lead-phone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="lead-source" style={labelStyle}>
            Source
          </label>
          <select
            id="lead-source"
            value={source}
            onChange={e => setSource(e.target.value)}
            style={inputStyle}
          >
            <option>Thumbtack</option>
            <option>Google</option>
            <option>Referral</option>
            <option>Website</option>
            <option>Other</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="lead-value" style={labelStyle}>
            Estimated Value
          </label>
          <PrefixInput
            id="lead-value"
            value={estimatedValue}
            onChange={setEstimatedValue}
            placeholder="0.00"
          />
        </div>

        <SaveButton loading={loading} label="Add Lead" />
      </form>
    </SlideModal>
  )
}

// ─── NEW PROJECT MODAL ────────────────────────────────────────────────────────

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [estimatedTotal, setEstimatedTotal] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClose = () => {
    setName('')
    setStartDate('')
    setEstimatedTotal('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('projects').insert({
        user_id: user.id,
        title: name,
        start_date: startDate || null,
        contract_value: estimatedTotal ? parseFloat(estimatedTotal) : null,
        status: 'Scheduled',
        payment_status: 'Unpaid',
      })
      if (error) throw error

      toast.success('Project created')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      handleClose()
    } catch (err) {
      toast.error('Failed to create project')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlideModal open={open} onClose={handleClose} title="New Project">
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label htmlFor="proj-name" style={labelStyle}>
            Project Name *
          </label>
          <input
            id="proj-name"
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="123 Main St — Exterior"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="proj-date" style={labelStyle}>
            Start Date
          </label>
          <input
            id="proj-date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="proj-total" style={labelStyle}>
            Estimated Total
          </label>
          <PrefixInput
            id="proj-total"
            value={estimatedTotal}
            onChange={setEstimatedTotal}
          />
        </div>

        <SaveButton loading={loading} label="Create Project" />
      </form>
    </SlideModal>
  )
}

// ─── NEW PROPOSAL MODAL ───────────────────────────────────────────────────────

const PROPOSAL_TEMPLATES = [
  { label: 'Interior Painting', value: 'interior' },
  { label: 'Exterior Painting', value: 'exterior' },
  { label: 'Cabinet Refinishing', value: 'cabinet' },
  { label: 'Custom / Other', value: 'custom' },
] as const

function NewProposalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [customerName, setCustomerName] = useState('')
  const [template, setTemplate] = useState('interior')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClose = () => {
    setCustomerName('')
    setTemplate('interior')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('proposals').insert({
        user_id: user.id,
        template,
        client_name: customerName,
        status: 'Draft',
        total_investment: null,
      })
      if (error) throw error

      toast.success('Proposal created')
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
      handleClose()
    } catch (err) {
      toast.error('Failed to create proposal')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlideModal open={open} onClose={handleClose} title="New Proposal">
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label htmlFor="prop-name" style={labelStyle}>
            Customer Name *
          </label>
          <input
            id="prop-name"
            type="text"
            required
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Jane Smith"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="prop-template" style={labelStyle}>
            Template Type
          </label>
          <select
            id="prop-template"
            value={template}
            onChange={e => setTemplate(e.target.value)}
            style={inputStyle}
          >
            {PROPOSAL_TEMPLATES.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <SaveButton loading={loading} label="Create Proposal" />
      </form>
    </SlideModal>
  )
}

// ─── LOG EXPENSE MODAL ────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Materials',
  'Labor',
  'Marketing',
  'Advertising',
  'Fuel',
  'Tools',
  'Subcontractors',
  'Overhead',
  'Insurance',
  'Software',
  'Other',
]

function LogExpenseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Materials')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClose = () => {
    setAmount('')
    setCategory('Materials')
    setDescription('')
    setDate(today)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('expenses').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        category,
        description: description || null,
        date,
        recurring: false,
      })
      if (error) throw error

      toast.success('Expense logged')
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      handleClose()
    } catch (err) {
      toast.error('Failed to log expense')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlideModal open={open} onClose={handleClose} title="Log Expense">
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label htmlFor="exp-amount" style={labelStyle}>
            Amount *
          </label>
          <PrefixInput
            id="exp-amount"
            value={amount}
            onChange={setAmount}
            required
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="exp-category" style={labelStyle}>
            Category
          </label>
          <select
            id="exp-category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={inputStyle}
          >
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="exp-desc" style={labelStyle}>
            Description
          </label>
          <input
            id="exp-desc"
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Sherwin-Williams paint"
            style={inputStyle}
          />
        </div>

        <div style={fieldStyle}>
          <label htmlFor="exp-date" style={labelStyle}>
            Date
          </label>
          <input
            id="exp-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <SaveButton loading={loading} label="Log Expense" />
      </form>
    </SlideModal>
  )
}

// ─── ADD NOTE MODAL ───────────────────────────────────────────────────────────

const NOTE_TYPES = ['General', 'Lead Follow-up', 'Project Update', 'Client Call', 'Other']

function AddNoteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [note, setNote] = useState('')
  const [type, setType] = useState('General')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleClose = () => {
    setNote('')
    setType('General')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('activities').insert({
        user_id: user.id,
        type: 'Note',
        content: note,
      })
      if (error) throw error

      toast.success('Note saved')
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      handleClose()
    } catch (err) {
      toast.error('Failed to save note')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlideModal open={open} onClose={handleClose} title="Add Note">
      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label htmlFor="note-type" style={labelStyle}>
            Type
          </label>
          <select
            id="note-type"
            value={type}
            onChange={e => setType(e.target.value)}
            style={inputStyle}
          >
            {NOTE_TYPES.map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label htmlFor="note-text" style={labelStyle}>
            Note *
          </label>
          <textarea
            id="note-text"
            required
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Write your note here…"
            style={{ ...inputStyle, minHeight: 96, resize: 'vertical', height: 'auto' }}
          />
        </div>

        <SaveButton loading={loading} label="Save Note" />
      </form>
    </SlideModal>
  )
}

// ─── FLOATING ACTION BUTTON (main export) ────────────────────────────────────

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ActionKey | null>(null)
  const [hoveredAction, setHoveredAction] = useState<ActionKey | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = () => setIsOpen(prev => !prev)

  const handleActionClick = (key: ActionKey) => {
    setIsOpen(false)
    setActiveModal(key)
  }

  const handleCloseModal = () => setActiveModal(null)

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  return (
    <>
      {/* FAB container — fixed position */}
      <div
        ref={containerRef}
        className="fab-mobile"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Action buttons — fan upward */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <AnimatePresence>
            {isOpen &&
              ACTIONS.map((action, i) => (
                <motion.div
                  key={action.key}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.8 }}
                  transition={{
                    type: 'spring',
                    damping: 22,
                    stiffness: 380,
                    delay: i * 0.05,
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  {/* Tooltip to the left */}
                  <AnimatePresence>
                    {hoveredAction === action.key && (
                      <motion.span
                        initial={{ opacity: 0, x: 6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ duration: 0.1, delay: 0.1 }}
                        style={{
                          background: 'var(--c-sidebar)',
                          color: 'var(--c-text-1)',
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: 'var(--font-body)',
                          padding: '5px 10px',
                          borderRadius: 999,
                          border: '1px solid var(--c-border)',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          boxShadow: 'var(--s-card)',
                        }}
                      >
                        {action.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Action circle button */}
                  <button
                    onClick={() => handleActionClick(action.key)}
                    aria-label={action.label}
                    onMouseEnter={() => setHoveredAction(action.key)}
                    onMouseLeave={() => setHoveredAction(null)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: action.color,
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: `0 4px 16px ${action.shadowColor}`,
                      transition: 'transform 150ms, box-shadow 150ms',
                      flexShrink: 0,
                    }}
                    onFocus={() => setHoveredAction(action.key)}
                    onBlur={() => setHoveredAction(null)}
                  >
                    {action.icon}
                  </button>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Main FAB trigger */}
        <motion.button
          onClick={handleToggle}
          aria-label="Quick actions"
          aria-expanded={isOpen}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#e6ab35',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isOpen
              ? '0 8px 32px rgba(230,171,53,0.5)'
              : '0 4px 16px rgba(230,171,53,0.35)',
            transition: 'box-shadow 200ms',
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <Plus size={24} aria-hidden="true" />
          </motion.div>
        </motion.button>
      </div>

      {/* Modals */}
      <NewLeadModal open={activeModal === 'lead'} onClose={handleCloseModal} />
      <NewProjectModal open={activeModal === 'project'} onClose={handleCloseModal} />
      <NewProposalModal open={activeModal === 'proposal'} onClose={handleCloseModal} />
      <LogExpenseModal open={activeModal === 'expense'} onClose={handleCloseModal} />
      <AddNoteModal open={activeModal === 'note'} onClose={handleCloseModal} />
    </>
  )
}
