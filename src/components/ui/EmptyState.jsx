/**
 * Designed empty/loading/error state — icon, one short line, one optional
 * action button. Replaces a plain grey sentence or a blank chart box.
 *
 * Deliberately NOT wired into AsyncSection yet (src/components/common/
 * AsyncSection.jsx) — that component is used by every page right now,
 * most of which haven't been redesigned yet; swapping its defaults today
 * would change visual output app-wide before this foundation step is
 * even reviewed. Each page's own redesign step should pass this in via
 * AsyncSection's existing `loadingSkeleton`/children-render-prop pattern
 * once that page is actually being redesigned.
 */
export default function EmptyState({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-glow-border px-6 py-10 text-center">
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-glow-brand/10">
          <Icon className="size-5 text-glow-brand/70" aria-hidden="true" />
        </span>
      )}
      <p className="text-sm text-glow-text/60">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-glow-border px-4 py-1.5 text-xs font-medium text-glow-text/80 transition-colors hover:bg-white/5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
