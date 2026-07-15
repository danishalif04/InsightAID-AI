/** Neutral tag/keyword chip — trending keywords, hashtags, filter tags. */
export default function Chip({ className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-slate-600 dark:border-line-dark dark:bg-canvas-dark dark:text-slate-300 ${className}`}
    >
      {children}
    </span>
  )
}
