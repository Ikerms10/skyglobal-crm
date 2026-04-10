import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  required?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, required, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#efeae2]">
            {label}{required && <span className="text-[#ef4444] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3] transition-colors',
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
Input.displayName = 'Input'
