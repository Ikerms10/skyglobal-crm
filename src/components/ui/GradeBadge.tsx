import { getProfitScore } from '@/lib/profitability'

interface GradeBadgeProps {
  contractValue: number
  totalCosts: number
  leadCost?: number
  size?: number
}

export function GradeBadge({ contractValue, totalCosts, leadCost = 0, size = 28 }: GradeBadgeProps) {
  const score = getProfitScore(contractValue, totalCosts, leadCost)
  if (!score) return null

  return (
    <div
      title={`${score.grade} · ${score.label} · ${score.margin}% margin`}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: score.bg, color: score.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.46, fontWeight: 800,
        flexShrink: 0, cursor: 'default',
      }}
    >
      {score.grade}
    </div>
  )
}
