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
          <label htmlFor={inputId} className="text-sm font-medium text-[#e2e8f0]">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
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
            'w-full rounded-lg border border-[#2a2d3a] bg-[#0f1117] px-3 py-2 text-sm text-[#e2e8f0]',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[color-scheme:dark]',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export { DatePicker }
