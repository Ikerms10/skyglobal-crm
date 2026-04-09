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
        className={cn('fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={onClose}
      />
      <div className={cn(
        'fixed right-0 top-0 h-full bg-[#1a1d27] border-l border-[#2a2d3a] shadow-2xl z-50 flex flex-col transition-transform duration-300 w-full',
        widths[width],
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3a] flex-shrink-0">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
