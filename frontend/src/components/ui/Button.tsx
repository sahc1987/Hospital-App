import { cn } from '@/utils/cn'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:   'bg-primary text-white shadow-orange hover:bg-primary-600 hover:shadow-none',
  secondary: 'bg-surface border border-border text-ink hover:bg-surface-card',
  dark:      'bg-surface-dark text-white hover:bg-black',
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
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
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
