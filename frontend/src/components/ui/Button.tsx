import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white shadow-primary hover:bg-primary-600 hover:shadow-none',
  secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  dark:      'bg-surface-dark text-white hover:bg-surface-darker',
  danger:    'bg-danger text-white hover:bg-red-600',
  ghost:     'text-ink-muted hover:bg-surface-card hover:text-ink',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  className,
  disabled,
  ...props
}: Readonly<ButtonProps>) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
