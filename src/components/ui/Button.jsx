import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-accent-500 text-white hover:bg-accent-600 focus-visible:ring-accent-400 disabled:bg-accent-300',
  secondary:
    'border border-line bg-surface text-slate-700 hover:bg-canvas focus-visible:ring-accent-400 dark:border-line-dark dark:bg-surface-dark dark:text-slate-200 dark:hover:bg-canvas-dark',
  ghost:
    'text-slate-600 hover:bg-canvas focus-visible:ring-accent-400 dark:text-slate-300 dark:hover:bg-canvas-dark',
  danger: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-red-400',
}

const SIZES = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
}

/** Shared action button — variant + size cover every CTA across the dashboard. */
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', icon: Icon, loading = false, className = '', children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icon && <Icon className="size-4" aria-hidden="true" />
      )}
      {children}
    </button>
  )
})

export default Button
