'use client'

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  error?: string
  required?: boolean
  value?: string
  onChange?: (value: string) => void
  min?: string
  max?: string
  className?: string
  id?: string
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, required, value, onChange, min, max, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--sg-text-1)]">
            {label}
            {required && <span className="text-[var(--sg-danger)] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type="date"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          min={min}
          max={max}
          className={cn(
            'w-full rounded-lg border border-[var(--sg-border)] bg-[var(--sg-surface)] px-3 py-2 text-sm text-[var(--sg-text-1)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--sg-sky)] focus:border-[var(--sg-sky)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[color-scheme:dark]',
            error && 'border-[var(--sg-danger)] focus:ring-[var(--sg-danger)]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[var(--sg-danger)]">{error}</p>}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export { DatePicker }
