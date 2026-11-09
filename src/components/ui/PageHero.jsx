import { motion } from 'framer-motion'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

/**
 * The hero block every page opens with, per the redesign's page pattern:
 * eyebrow chip, a title with 1-3 words rendered in the accent serif
 * italic, a one-line description, and an actions slot on the right.
 *
 * `highlight` is matched against `title` by exact substring and wrapped
 * in the serif-italic treatment; if it isn't found, the whole title
 * renders in the normal UI typeface (never silently drops the title).
 */
export default function PageHero({ eyebrow, title, highlight, description, actions }) {
  const motionAllowed = useMotionAllowed()
  const parts = highlight && title.includes(highlight) ? title.split(highlight) : [title]

  return (
    <motion.div
      initial={motionAllowed ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionAllowed ? 0.4 : 0 }}
      className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && (
          <span className="inline-flex items-center rounded-full border border-glow-border bg-glow-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-glow-brand">
            {eyebrow}
          </span>
        )}
        <h1 className="mt-3 text-[2.25rem] font-semibold tracking-tight text-glow-text sm:text-[2.75rem]" style={{ fontFamily: 'var(--font-ui)' }}>
          {parts.length === 2 ? (
            <>
              {parts[0]}
              <em className="not-italic" style={{ fontFamily: 'var(--font-serif-accent)', fontStyle: 'italic' }}>
                {highlight}
              </em>
              {parts[1]}
            </>
          ) : (
            title
          )}
        </h1>
        {description && <p className="mt-2 max-w-xl text-sm text-glow-text/60">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
