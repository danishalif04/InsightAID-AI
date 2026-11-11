import ProvenanceBadge from './ProvenanceBadge'

/** Standard Local Shop panel: title, optional provenance, optional note. */
export default function Section({ title, description, provenance, note, actions, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
              {provenance && <ProvenanceBadge kind={provenance} />}
            </div>
            {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={title ? 'mt-4' : ''}>{children}</div>
      {note && <p className="mt-3 text-[11px] leading-relaxed text-glow-text/40">{note}</p>}
    </section>
  )
}
