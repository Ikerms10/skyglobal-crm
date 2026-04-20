'use client'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const base = [
  'inline-flex items-center justify-center gap-2 font-semibold text-sm',
  'rounded-[var(--r-sm)] transition-all duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-sage-soft)] focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed select-none',
].join(' ')

const variants = {
  primary:   'bg-[var(--c-gold)] text-[var(--c-text-on-gold)] hover:bg-[var(--c-gold-mid)] active:scale-[0.97] active:brightness-95 shadow-[var(--s-button)] hover:shadow-[var(--s-button-hover)] hover:-translate-y-px',
  secondary: 'bg-[var(--c-card)] border border-[var(--c-border-mid)] text-[var(--c-text-2)] hover:bg-[var(--c-nested)] hover:border-[var(--c-border-strong)] shadow-[var(--s-card)] hover:-translate-y-px hover:shadow-[var(--s-card-hover)]',
  ghost:     'bg-transparent text-[var(--c-text-3)] hover:bg-[var(--c-nested)] hover:text-[var(--c-text-1)]',
  danger:    'bg-[var(--c-danger-bg)] border border-[var(--c-danger-border)] text-[var(--c-danger)] hover:bg-[#F0E0DD] hover:border-[rgba(185,74,58,0.35)]',
  sky:       'bg-[var(--c-sage)] text-[var(--c-text-on-gold)] font-bold hover:brightness-110 active:scale-[0.97] shadow-[var(--s-button)] hover:-translate-y-px',
  // Legacy variants
  success:   'bg-[var(--c-sage-bg)] border border-[var(--c-sage-border)] text-[var(--c-sage)] hover:brightness-95',
  icon:      'bg-transparent text-[var(--c-text-3)] hover:bg-[var(--c-nested)] hover:text-[var(--c-text-1)] w-8 h-8 p-0',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, loading, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
      ) : null}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
