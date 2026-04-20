'use client'
import { useEffect, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const maxWidths = { sm: 400, md: 480, lg: 560, xl: 720 }

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

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

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
      className="md:items-center md:p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(28,18,9,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn('animate-scale-in relative w-full flex flex-col', 'rounded-t-[20px] md:rounded-[16px]')}
        style={{
          maxWidth: maxWidths[size],
          maxHeight: '95vh',
          background: 'var(--c-card)',
          backdropFilter: 'blur(20px) saturate(200%)',
          WebkitBackdropFilter: 'blur(20px) saturate(200%)',
          border: '1px solid var(--c-border)',
          boxShadow: 'var(--s-modal)',
          overflow: 'hidden',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Top accent line */}
        <div style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent, var(--c-gold), transparent)',
          flexShrink: 0,
        }} aria-hidden="true" />

        {/* Header */}
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px 14px',
            borderBottom: '1px solid var(--c-border)',
            flexShrink: 0,
          }}>
            <h2
              id="modal-title"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--c-text-1)',
                margin: 0,
                fontFamily: 'var(--font-rajdhani)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid var(--c-border)',
                color: 'var(--c-text-4)',
                cursor: 'pointer',
                transition: 'background 150ms, color 150ms, border-color 150ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(185,74,58,0.10)'
                e.currentTarget.style.color = 'var(--c-danger)'
                e.currentTarget.style.borderColor = 'rgba(185,74,58,0.3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--c-text-4)'
                e.currentTarget.style.borderColor = 'var(--c-border)'
              }}
              aria-label="Close"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '14px 24px',
            borderTop: '1px solid var(--c-border)',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
