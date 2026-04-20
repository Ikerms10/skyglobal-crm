import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1">
        {label && <label htmlFor={inputId} className="block text-sm font-medium" style={{ color: 'var(--c-text-3)' }}>{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border rounded-[var(--r-sm)] px-3 py-2 text-sm focus:outline-none transition-colors resize-none',
            error && 'border-[var(--c-danger)]',
            className
          )}
          style={{
            background: 'var(--c-card)',
            borderColor: error ? 'var(--c-danger)' : 'var(--c-border)',
            color: 'var(--sg-text-1)',
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--c-sage-soft)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)'
            }
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? 'var(--c-danger)' : 'var(--c-border)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          {...props}
        />
        {error && <p className="text-xs" style={{ color: 'var(--c-danger)' }}>{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
