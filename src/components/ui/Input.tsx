import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {label && (
          <label htmlFor={inputId} style={{ fontSize: 13, fontWeight: 500, color: 'var(--c-text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {label}
            {required && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--sg-gold)', display: 'inline-block', flexShrink: 0 }} />
            )}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            'w-full transition-all outline-none',
            error ? 'ring-1 ring-[var(--error)]' : '',
            className
          )}
          style={{
            background: 'var(--c-card)',
            border: `1px solid ${error ? 'var(--c-danger)' : 'var(--c-border)'}`,
            borderRadius: 'var(--r-sm)',
            padding: '10px 14px',
            fontSize: 16,
            color: 'var(--sg-text-1)',
            transition: 'border-color 150ms, box-shadow 150ms',
            ...props.style,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--c-sage-soft)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(122,158,126,0.18)'
            }
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--c-danger)' : 'var(--c-border)'
            e.currentTarget.style.boxShadow = 'none'
            props.onBlur?.(e)
          }}
          {...props}
        />
        {error && (
          <p style={{ fontSize: 12, color: 'var(--c-danger)', marginTop: 2 }}>{error}</p>
        )}
        {hint && !error && (
          <p style={{ fontSize: 12, color: 'var(--c-text-4)', marginTop: 2 }}>{hint}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
