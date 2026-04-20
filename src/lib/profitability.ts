export interface ProfitScore {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
  color: string
  bg: string
  margin: string
}

export function getProfitScore(
  contractValue: number,
  totalCosts: number,
  leadCost = 0
): ProfitScore | null {
  if (!contractValue || contractValue === 0) return null

  const profit = contractValue - totalCosts - leadCost
  const margin = (profit / contractValue) * 100

  if (margin >= 40) return { grade: 'A', label: 'Excellent',    color: '#4A6741', bg: 'rgba(74,103,65,0.12)',   margin: margin.toFixed(1) }
  if (margin >= 25) return { grade: 'B', label: 'Good',         color: '#7A9E7E', bg: 'rgba(122,158,126,0.10)', margin: margin.toFixed(1) }
  if (margin >= 10) return { grade: 'C', label: 'Average',      color: '#8B6914', bg: 'rgba(139,105,20,0.12)',  margin: margin.toFixed(1) }
  if (margin >= 0)  return { grade: 'D', label: 'Low Margin',   color: '#D4A853', bg: 'rgba(212,168,83,0.12)',  margin: margin.toFixed(1) }
  return              { grade: 'F', label: 'Losing Money',  color: '#B94A3A', bg: 'rgba(185,74,58,0.12)',  margin: margin.toFixed(1) }
}
