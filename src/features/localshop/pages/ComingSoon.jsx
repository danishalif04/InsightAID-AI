import { Hammer } from 'lucide-react'

/**
 * Honest placeholder for a Local Shop screen that is routed but not built
 * yet. It states plainly that the screen does not exist rather than
 * rendering an empty dashboard that looks broken or, worse, a mock that
 * looks operational.
 */
export default function ComingSoon({ title, phase }) {
  return (
    <div className="rounded-3xl border border-dashed border-glow-border bg-glow-surface-elevated p-8 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-glow-brand/10">
        <Hammer className="size-5 text-glow-brand/70" aria-hidden="true" />
      </span>
      <h2 className="mt-3 text-sm font-semibold text-glow-text">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-glow-text/50">
        This screen is not built yet{phase ? ` (planned for ${phase})` : ''}. Nothing here is hidden or disabled —
        it simply does not exist, and no figures on other screens depend on it.
      </p>
    </div>
  )
}
