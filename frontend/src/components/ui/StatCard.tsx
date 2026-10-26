import { cn } from '@/utils/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: number
  dark?: boolean
  accent?: boolean
  className?: string
}

export function StatCard({ title, value, icon, trend, dark, accent, className }: StatCardProps) {
  const positive = trend !== undefined && trend >= 0

  if (dark) {
    return (
      <div className={cn('card-dark flex flex-col gap-4 min-h-[130px]', className)}>
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            {icon}
          </div>
        </div>
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend !== undefined && (
            // white, not green/red: tinted text fails contrast on the blue card
            <div className="flex items-center gap-1 mt-1 text-xs font-medium text-white">
              {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}% last month</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card flex flex-col gap-4 min-h-[130px]', className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink-muted">{title}</p>
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          accent ? 'bg-primary text-white shadow-primary' : 'bg-primary-50 text-primary',
        )}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-ink">{value}</p>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', positive ? 'text-success' : 'text-danger')}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(trend)}% last month</span>
          </div>
        )}
      </div>
    </div>
  )
}
