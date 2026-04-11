'use client'
import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
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

  const sizes = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-lg', xl: 'md:max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="absolute inset-0 bg-[#1d1c17]/80 backdrop-blur-sm" onClick={onClose} />
      <div className="min-h-full flex items-end md:items-center justify-center md:p-4">
        <div className={cn(
          'relative bg-[#252419] border border-[#2e2d26] w-full flex flex-col max-h-[95vh]',
          'rounded-t-2xl md:rounded-xl md:shadow-2xl',
          sizes[size],
        )}>
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2e2d26] flex-shrink-0">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <button onClick={onClose} className="text-[#9a9585] hover:text-[#efeae2] transition-colors p-1 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
