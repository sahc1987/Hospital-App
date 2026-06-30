import { cn } from '@/utils/cn'

type Variant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'orange' | 'dark'

const variants: Record<Variant, string> = {
  default: 'bg-zinc-100 text-zinc-700',
  success: 'bg-success-light text-success',
  danger:  'bg-danger-light text-danger',
  warning: 'bg-warning-light text-warning',
  info:    'bg-info-light text-info',
  orange:  'bg-primary/10 text-primary',
  dark:    'bg-surface-dark text-white',
}

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

// Status-specific convenience components
const statusMap: Record<string, Variant> = {
  SCHEDULED: 'info',     CONFIRMED: 'success', COMPLETED: 'success',
  CANCELLED: 'danger',   NO_SHOW: 'warning',
  ADMITTED: 'orange',    DISCHARGED: 'success', TRANSFERRED: 'info',
  AVAILABLE: 'success',  OCCUPIED: 'danger',   MAINTENANCE: 'warning',
  ORDERED: 'info',       COLLECTED: 'warning', IN_PROGRESS: 'orange',
  PENDING: 'warning',    PARTIAL: 'orange',    PAID: 'success',
  REFUNDED: 'info',      SUBMITTED: 'info',    UNDER_REVIEW: 'warning',
  APPROVED: 'success',   REJECTED: 'danger',   SETTLED: 'success',
}

export function StatusBadge({ status }: { status: string }) {
  const variant = statusMap[status] ?? 'default'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}
