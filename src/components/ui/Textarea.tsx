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
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-[#efeae2]">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#252419] border border-[#2e2d26] text-[#efeae2] placeholder-[#9a9585] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#3583b3] focus:border-[#3583b3] transition-colors resize-none',
            error && 'border-[#ef4444]',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
