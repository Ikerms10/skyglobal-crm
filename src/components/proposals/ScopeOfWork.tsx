'use client'
import { KeyboardEvent, useRef } from 'react'

export type ScopeStep = { title: string; bullets: string[] }

interface Props {
  steps: ScopeStep[]
  onChange: (steps: ScopeStep[]) => void
}

const inputBase: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  fontFamily: 'Georgia, "Times New Roman", serif',
  padding: '1px 0',
  width: '100%',
}

export function ScopeOfWork({ steps, onChange }: Props) {
  const bulletRefs = useRef<(HTMLInputElement | null)[][]>([])

  const updateTitle = (si: number, title: string) =>
    onChange(steps.map((s, i) => (i === si ? { ...s, title } : s)))

  const updateBullet = (si: number, bi: number, text: string) =>
    onChange(steps.map((s, i) => (i === si ? { ...s, bullets: s.bullets.map((b, j) => (j === bi ? text : b)) } : s)))

  const addBulletAfter = (si: number, bi: number) => {
    const next = steps.map((s, i) => {
      if (i !== si) return s
      const bullets = [...s.bullets]
      bullets.splice(bi + 1, 0, '')
      return { ...s, bullets }
    })
    onChange(next)
    setTimeout(() => bulletRefs.current[si]?.[bi + 1]?.focus(), 0)
  }

  const removeBullet = (si: number, bi: number) => {
    if (steps[si].bullets.length <= 1) return
    onChange(steps.map((s, i) => (i === si ? { ...s, bullets: s.bullets.filter((_, j) => j !== bi) } : s)))
    setTimeout(() => bulletRefs.current[si]?.[Math.max(0, bi - 1)]?.focus(), 0)
  }

  const addStep = () => onChange([...steps, { title: 'New Step', bullets: [''] }])

  const removeStep = (si: number) => {
    if (steps.length <= 1) return
    onChange(steps.filter((_, i) => i !== si))
  }

  return (
    <div>
      {steps.map((step, si) => (
        <div key={si} className="group/step" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              value={step.title}
              onChange={e => updateTitle(si, e.target.value)}
              style={{
                ...inputBase,
                fontWeight: 700,
                color: '#1C1209',
                fontSize: 13,
                borderBottom: '1px dashed transparent',
              }}
              className="hover:border-b-[#D4A853] focus:border-b-[#D4A853] transition-colors placeholder-[#A07850]"
              placeholder="Step title..."
            />
            <button
              onClick={() => removeStep(si)}
              className="opacity-0 group-hover/step:opacity-100 transition-opacity"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#B94A3A', fontSize: 11, padding: '0 4px', lineHeight: 1,
                flexShrink: 0,
              }}
              title="Remove step"
            >
              ✕
            </button>
          </div>
          {step.bullets.map((bullet, bi) => (
            <div key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginLeft: 16, marginBottom: 2 }}>
              <span style={{ color: '#5C4A38', fontSize: 13, lineHeight: 1.7, userSelect: 'none', flexShrink: 0 }}>•</span>
              <input
                ref={el => {
                  if (!bulletRefs.current[si]) bulletRefs.current[si] = []
                  bulletRefs.current[si][bi] = el
                }}
                value={bullet}
                onChange={e => updateBullet(si, bi, e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') { e.preventDefault(); addBulletAfter(si, bi) }
                  if (e.key === 'Backspace' && bullet === '') { e.preventDefault(); removeBullet(si, bi) }
                }}
                placeholder="Bullet point..."
                style={{
                  ...inputBase,
                  color: '#5C4A38',
                  fontSize: 13,
                  lineHeight: 1.7,
                  borderBottom: '1px dashed transparent',
                }}
                className="hover:border-b-[#D4A853] focus:border-b-[#D4A853] transition-colors placeholder-[#A07850]"
              />
            </div>
          ))}
        </div>
      ))}
      <button
        onClick={addStep}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', color: '#4A6741', fontSize: 11,
          fontFamily: 'sans-serif', border: '1.5px dashed #4A6741',
          borderRadius: 4, padding: '4px 12px', background: 'transparent', marginTop: 8,
        }}
        className="hover:bg-[rgba(74,103,65,0.08)] transition-colors"
      >
        + Add Step
      </button>
    </div>
  )
}
