import { forwardRef } from 'react'

const fieldClasses =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-line-dark dark:bg-surface-dark dark:text-slate-200'

export const Input = forwardRef(function Input({ label, icon: Icon, className = '', id, ...props }, ref) {
  return (
    <label className="block text-sm" htmlFor={id}>
      {label && <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
      <span className="relative flex items-center">
        {Icon && <Icon className="pointer-events-none absolute left-3 size-4 text-slate-400" aria-hidden="true" />}
        <input
          ref={ref}
          id={id}
          className={`${fieldClasses} ${Icon ? 'pl-9' : ''} ${className}`}
          {...props}
        />
      </span>
    </label>
  )
})

export const Select = forwardRef(function Select({ label, className = '', id, children, ...props }, ref) {
  return (
    <label className="block text-sm" htmlFor={id}>
      {label && <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
      <select ref={ref} id={id} className={`${fieldClasses} ${className}`} {...props}>
        {children}
      </select>
    </label>
  )
})

export const Textarea = forwardRef(function Textarea({ label, className = '', id, ...props }, ref) {
  return (
    <label className="block text-sm" htmlFor={id}>
      {label && <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>}
      <textarea ref={ref} id={id} className={`${fieldClasses} resize-none ${className}`} {...props} />
    </label>
  )
})
