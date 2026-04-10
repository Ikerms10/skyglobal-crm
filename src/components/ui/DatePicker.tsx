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
          <label htmlFor={inputId} className="text-sm font-medium text-[#efeae2]">
            {label}
            {required && <span className="text-[#ef4444] ml-1">*</span>}
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
            'w-full rounded-lg border border-[#2e2d26] bg-[#252419] px-3 py-2 text-sm text-[#efeae2]',
            'focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            '[color-scheme:dark]',
            error && 'border-[#ef4444] focus:ring-[#ef4444]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    )
  }
)

DatePicker.displayName = 'DatePicker'

export { DatePicker }
