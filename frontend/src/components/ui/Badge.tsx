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

export function Badge({ variant = 'default', children, className }: Readonly<BadgeProps>) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}

/** Role tints shared by Users, Profile and Access Matrix; every pair clears 4.5:1. */
export const roleTone: Record<string, string> = {
  ADMIN:        'bg-danger-light text-danger-ink',
  DOCTOR:       'bg-info-light text-info-ink',
  NURSE:        'bg-success-light text-success-ink',
  RECEPTIONIST: 'bg-warning-light text-warning-ink',
  LAB_TECH:     'bg-pink-light text-pink-ink',
  PHARMACIST:   'bg-mint-light text-mint-deep',
  HR:           'bg-primary-100 text-primary-800', // primary-50 vanishes on the lavender canvas
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

export function StatusBadge({ status }: Readonly<{ status: string }>) {
  const variant = statusMap[status] ?? 'default'
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>
}
