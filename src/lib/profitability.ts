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

  if (margin >= 40) return { grade: 'A', label: 'Excellent',    color: '#30d158', bg: 'rgba(48,209,88,0.15)',   margin: margin.toFixed(1) }
  if (margin >= 25) return { grade: 'B', label: 'Good',         color: '#3583b3', bg: 'rgba(53,131,179,0.15)',  margin: margin.toFixed(1) }
  if (margin >= 10) return { grade: 'C', label: 'Average',      color: '#e6ab35', bg: 'rgba(230,171,53,0.15)',  margin: margin.toFixed(1) }
  if (margin >= 0)  return { grade: 'D', label: 'Low Margin',   color: '#ff9f0a', bg: 'rgba(255,159,10,0.15)',  margin: margin.toFixed(1) }
  return              { grade: 'F', label: 'Losing Money',  color: '#ff453a', bg: 'rgba(255,69,58,0.15)',   margin: margin.toFixed(1) }
}
