import { LucideIcon } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="animate-fadeIn"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      {Icon && (
        <div
          style={{
            padding: 20,
            background: 'var(--c-nested)',
            borderRadius: '50%',
            marginBottom: 20,
            border: '1px solid var(--c-border)',
          }}
        >
          <Icon style={{ width: 48, height: 48, color: 'var(--c-gold)' }} strokeWidth={1.5} />
        </div>
      )}
      <h3
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--c-text-1)',
          marginBottom: 8,
          margin: '0 0 8px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            color: 'var(--c-text-3)',
            fontSize: 14,
            maxWidth: 360,
            marginBottom: 24,
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}
        >
          {description}
        </p>
      )}
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  )
}
