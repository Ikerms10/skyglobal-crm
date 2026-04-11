'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    background: 'var(--gold)',
    color: 'var(--gold-text)',
    border: '1px solid transparent',
    fontWeight: 600,
  },
  secondary: {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    fontWeight: 500,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    fontWeight: 500,
  },
  danger: {
    background: 'var(--error)',
    color: '#ffffff',
    border: '1px solid transparent',
    fontWeight: 600,
  },
  icon: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
    fontWeight: 500,
    padding: 0,
  },
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-sm)' },
  md: { height: 36, padding: '0 16px', fontSize: 14, borderRadius: 'var(--radius-md)' },
  lg: { height: 44, padding: '0 20px', fontSize: 15, borderRadius: 'var(--radius-md)' },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, style, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all select-none',
          'active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2',
          variant === 'primary' && 'hover:opacity-90',
          variant === 'secondary' && 'hover:bg-[var(--bg-secondary)]',
          variant === 'ghost' && 'hover:bg-[var(--bg-secondary)]',
          variant === 'danger' && 'hover:opacity-90',
          variant === 'icon' && 'hover:bg-[var(--bg-secondary)] rounded-[var(--radius-sm)] w-8 h-8',
          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
          className
        )}
        style={{
          ...variantStyles[variant],
          ...sizeStyles[size],
          letterSpacing: '-0.01em',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'opacity 150ms, background 150ms, transform 100ms, box-shadow 150ms',
          ...style,
        }}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : null}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
