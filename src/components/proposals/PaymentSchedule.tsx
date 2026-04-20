'use client'

interface PaymentScheduleProps {
  total: number | null
  depositPct: number
  progressPct: number
  finalPct: number
  onDepositChange: (v: number) => void
  onProgressChange: (v: number) => void
  onFinalChange: (v: number) => void
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pctInput(value: number, onChange: (v: number) => void) {
  return (
    <input
      type="number"
      value={value}
      min={0}
      max={100}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      style={{
        width: 44,
        background: 'rgba(230,171,53,0.07)',
        border: '1px solid var(--sg-gold)',
        borderRadius: 3,
        color: '#1a1a1a',
        fontSize: 12,
        fontFamily: 'Georgia, serif',
        textAlign: 'center',
        padding: '1px 4px',
        outline: 'none',
      }}
    />
  )
}

export function PaymentSchedule({ total, depositPct, progressPct, finalPct, onDepositChange, onProgressChange, onFinalChange }: PaymentScheduleProps) {
  const totalSum = depositPct + progressPct + finalPct
  const pctWarn = Math.abs(totalSum - 100) > 0.1

  const depositAmt = total ? total * (depositPct / 100) : null
  const progressAmt = total ? total * (progressPct / 100) : null
  const finalAmt = total ? total * (finalPct / 100) : null

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
    fontSize: 13,
    color: '#1a1a1a',
  }

  return (
    <div>
      <div style={rowStyle}>
        <span>
          Initial Deposit ({pctInput(depositPct, onDepositChange)}%): Due 48 hours prior to start
        </span>
        <strong style={{ whiteSpace: 'nowrap' }}>
          {depositAmt != null ? `$${fmt(depositAmt)}` : '—'}
        </strong>
      </div>
      <div style={rowStyle}>
        <span>
          Progress Payment ({pctInput(progressPct, onProgressChange)}%): Due upon 50% completion
        </span>
        <strong style={{ whiteSpace: 'nowrap' }}>
          {progressAmt != null ? `$${fmt(progressAmt)}` : '—'}
        </strong>
      </div>
      <div style={rowStyle}>
        <span>
          Final Balance ({pctInput(finalPct, onFinalChange)}%): Due upon project completion
        </span>
        <strong style={{ whiteSpace: 'nowrap' }}>
          {finalAmt != null ? `$${fmt(finalAmt)}` : '—'}
        </strong>
      </div>

      {pctWarn && (
        <div style={{
          marginTop: 6,
          padding: '4px 10px',
          background: 'var(--c-gold-bg)',
          border: '1px solid var(--c-gold-border)',
          borderRadius: 4,
          fontSize: 11,
          color: 'var(--c-gold)',
          fontFamily: 'sans-serif',
        }}>
          ⚠ Percentages total {fmt(totalSum)}% — must equal 100%
        </div>
      )}

      <p style={{ marginTop: 10, fontSize: 11, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5 }}>
        SkyGlobal Renovations operates with full financial transparency. All material costs are invoiced at direct Sherwin-Williams contractor pricing with zero markup. Labor and overhead are itemized and available upon request.
      </p>
    </div>
  )
}
