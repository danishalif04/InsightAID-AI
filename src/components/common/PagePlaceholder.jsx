/**
 * Temporary stand-in rendered by every page until its build phase.
 * Verifies routing, the shared layout, tokens, and dark mode end to end.
 */
export default function PagePlaceholder({ title, description, phase }) {
  return (
    <section className="rounded-card border border-line bg-surface p-8 shadow-card dark:border-line-dark dark:bg-surface-dark">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <p className="mt-6 inline-flex rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-600/15 dark:text-accent-300">
        Scheduled for Phase {phase}
      </p>
    </section>
  )
}
