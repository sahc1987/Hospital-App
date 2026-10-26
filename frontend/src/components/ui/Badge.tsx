import { cn } from '@/utils/cn'

type Variant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'orange' | 'dark'

const variants: Record<Variant, string> = {
  default: 'bg-surface-card text-ink-muted',
  success: 'bg-success-light text-success-ink',
  danger:  'bg-danger-light text-danger-ink',
  warning: 'bg-warning-light text-warning-ink',
  info:    'bg-info-light text-info-ink',
  orange:  'bg-primary-50 text-primary-700', // name kept for existing callers; now the brand tint
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
  SCHEDULED: 'default',  CONFIRMED: 'info',    CHECKED_IN: 'orange',  IN_CONSULTATION: 'warning',  COMPLETED: 'success',
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
