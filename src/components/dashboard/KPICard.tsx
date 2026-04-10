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
  accentColor = 'text-[#e6ab35]',
}: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-[#252419] rounded-xl border-l-4 border-l-[#e6ab35] border border-[#2e2d26] p-5">
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
    <div className={cn('bg-[#252419] rounded-xl border-l-4 border-l-[#e6ab35] border border-[#2e2d26] p-5 hover:border-[#e6ab35]/40 transition-colors', className)}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[#9a9585] uppercase tracking-wider">{title}</p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-lg bg-[#2e2d26] flex items-center justify-center', accentColor)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#e6ab35] mb-1">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-emerald-400' : 'text-[#ef4444]'
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
          <p className="text-xs text-[#9a9585]">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
