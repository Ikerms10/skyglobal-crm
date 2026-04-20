'use client'
import { X } from 'lucide-react'
import { useState } from 'react'
import { ProposalTemplate } from '@/types'

interface Template {
  id: ProposalTemplate
  icon: string
  name: string
  description: string
}

const TEMPLATES: Template[] = [
  { id: 'interior', icon: '🖌️', name: 'Interior Painting', description: 'Full interior repaint, walls, trim & baseboards' },
  { id: 'exterior', icon: '🏠', name: 'Exterior Painting', description: '4-step exterior protection & finishing system' },
  { id: 'cabinet', icon: '🗄️', name: 'Cabinet Refinishing', description: '10-phase factory-grade cabinet restoration' },
  { id: 'custom', icon: '📄', name: 'Custom / Other', description: 'Epoxy floors, drywall, paver sealing & more' },
]

interface TemplateSelectorProps {
  onSelect: (template: ProposalTemplate) => void
  onClose: () => void
  customerId?: string
}

export function TemplateSelector({ onSelect, onClose, customerId }: TemplateSelectorProps) {
  const [hoveredId, setHoveredId] = useState<ProposalTemplate | null>(null)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--sg-surface)',
        border: '1px solid var(--sg-border-bright)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 540,
        padding: 32,
        position: 'relative',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sg-text-3)', padding: 4,
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--sg-text-1)', marginBottom: 6, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
          Choose a Proposal Template
        </h2>
        <p style={{ fontSize: 13, color: 'var(--sg-text-2)', marginBottom: 28 }}>
          Select a service type to open the visual editor
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              onMouseEnter={() => setHoveredId(t.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                background: hoveredId === t.id ? 'var(--sg-elevated)' : 'var(--sg-base)',
                border: `2px solid ${hoveredId === t.id ? 'var(--sg-sky)' : 'var(--sg-border)'}`,
                borderRadius: 12,
                padding: '20px 18px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                transform: hoveredId === t.id ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 10 }}>{t.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sg-text-1)', marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'var(--sg-text-2)', lineHeight: 1.4 }}>{t.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
