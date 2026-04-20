'use client'
import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
}

export function Drawer({ open, onClose, title, children, width = 'md' }: DrawerProps) {
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

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }

  return (
    <>
      <div
        className={cn('fixed inset-0 backdrop-blur-sm z-40 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        style={{ background: 'rgba(28,18,9,0.5)' }}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 w-full',
          widths[width],
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ background: 'var(--c-card)', borderLeft: '1px solid var(--c-border)' }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--c-border)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--c-text-1)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="transition-colors p-1 rounded"
              style={{ color: 'var(--c-text-4)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text-1)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-4)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
