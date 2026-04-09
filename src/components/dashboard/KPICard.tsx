import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'

interface KPICardProps {
  title: string
  value: string
  trend?: number // percentage change vs prior period
  icon?: React.ReactNode
  loading?: boolean
  subtitle?: string
  className?: string
  accentColor?: string
}

export function KPICard({
  title,
  value,
  trend,
  icon,
  loading = false,
  subtitle,
  className,
  accentColor = 'text-sky-400',
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-5">
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <div className={cn('bg-[#1a1d27] rounded-xl border border-[#2a2d3a] p-5 hover:border-[#3a3d4a] transition-colors', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-lg bg-[#2a2d3a] flex items-center justify-center', accentColor)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#e2e8f0] mb-1">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-[#94a3b8]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
