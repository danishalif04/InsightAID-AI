/** Shared surface container — every dashboard section sits inside one of these. */
export default function Card({ title, description, actions, className = '', bodyClassName = '', children }) {
  const hasHeader = title || actions
  return (
    <section
      className={`rounded-card border border-line bg-surface shadow-card dark:border-line-dark dark:bg-surface-dark ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 dark:border-line-dark">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
