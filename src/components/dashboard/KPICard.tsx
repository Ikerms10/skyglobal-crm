'use client'
import { useEffect, useRef } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

const COLOR_MAP = {
  gold:   { border: '#8B6914', glow: 'rgba(139,105,20,0.25)',  stroke: '#8B6914', fill: 'rgba(139,105,20,0.12)', text: '#8B6914' },
  green:  { border: '#4A6741', glow: 'rgba(74,103,65,0.2)',    stroke: '#4A6741', fill: 'rgba(74,103,65,0.10)',  text: '#4A6741' },
  sky:    { border: '#7A9E7E', glow: 'rgba(122,158,126,0.2)',  stroke: '#7A9E7E', fill: 'rgba(122,158,126,0.10)', text: '#7A9E7E' },
  blue:   { border: '#7A9E7E', glow: 'rgba(122,158,126,0.2)',  stroke: '#7A9E7E', fill: 'rgba(122,158,126,0.10)', text: '#7A9E7E' },
  purple: { border: '#A78BFA', glow: 'rgba(167,139,250,0.2)',  stroke: '#A78BFA', fill: 'rgba(167,139,250,0.10)', text: '#A78BFA' },
  red:    { border: '#B94A3A', glow: 'rgba(185,74,58,0.2)',    stroke: '#B94A3A', fill: 'rgba(185,74,58,0.10)',  text: '#B94A3A' },
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function formatValue(value: number, fmt: 'currency' | 'number' | 'percent'): string {
  if (fmt === 'currency') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  if (fmt === 'percent')  return `${value.toFixed(1)}%`
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

interface KPICardProps {
  label: string
  value: number
  format: 'currency' | 'number' | 'percent'
  color: 'gold' | 'green' | 'sky' | 'blue' | 'purple' | 'red'
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  trend?: { value: number; label: string }
  sparkline?: number[]
  href?: string
  loading?: boolean
  // Legacy compat
  title?: string
  subtitle?: string
  className?: string
  accentColor?: string
}

export function KPICard({ label, value, format, color, icon: Icon, trend, sparkline, loading }: KPICardProps) {
  const displayRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)
  const c = COLOR_MAP[color] ?? COLOR_MAP.sky

  useEffect(() => {
    if (loading || hasAnimated.current || !displayRef.current || value === 0) return
    hasAnimated.current = true
    const duration = 1400
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = easeOutExpo(t)
      if (displayRef.current) displayRef.current.textContent = formatValue(value * eased, format)
      if (t < 1) requestAnimationFrame(tick)
      else if (displayRef.current) displayRef.current.textContent = formatValue(value, format)
    }
    requestAnimationFrame(tick)
  }, [value, format, loading])

  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }))

  return (
    <div
      style={{
        background: 'var(--c-card)',
        border: '1px solid var(--c-border-light)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--s-card), var(--s-card-inset)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--c-border-mid)'
        e.currentTarget.style.boxShadow = 'var(--s-card-hover), var(--s-card-hover-inset)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--c-border-light)'
        e.currentTarget.style.boxShadow = 'var(--s-card), var(--s-card-inset)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Top accent bar — 3px, flush to top */}
      <div style={{ height: 3, background: c.border, boxShadow: `0 0 12px ${c.glow}` }} />

      {/* Card body */}
      <div style={{ padding: '16px 20px 0' }}>
        {loading ? (
          <div>
            <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 36, width: 120, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 10, width: 60 }} />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                color: 'var(--c-text-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}>
                {label}
              </p>
              <Icon size={18} style={{ color: c.border, opacity: 0.5 }} />
            </div>

            <span
              ref={displayRef}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                fontSize: '1.75rem',
                letterSpacing: '-0.04em',
                color: 'var(--c-text-1)',
                display: 'block',
                lineHeight: 1,
              }}
            >
              {formatValue(value, format)}
            </span>

            {trend && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                {trend.value >= 0
                  ? <TrendingUp size={11} style={{ color: 'var(--c-sage)' }} />
                  : <TrendingDown size={11} style={{ color: 'var(--c-danger)' }} />}
                <span style={{
                  fontSize: 11,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  color: trend.value >= 0 ? 'var(--c-sage)' : 'var(--c-danger)',
                  fontWeight: 600,
                }}>
                  {trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sparkline */}
      {!loading && sparkData.length > 0 && (
        <div style={{ height: 52, marginTop: 12 }}>
          <ResponsiveContainer width="100%" height={52}>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c.stroke} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={c.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={c.stroke}
                strokeWidth={1.5}
                fill={`url(#spark-${color})`}
                animationDuration={1500}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {!loading && sparkData.length === 0 && <div style={{ height: 16 }} />}
    </div>
  )
}
