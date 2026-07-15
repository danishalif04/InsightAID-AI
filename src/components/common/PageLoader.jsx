export default function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading page">
      <span className="size-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-800 dark:border-brand-800 dark:border-t-accent-400" />
    </div>
  )
}
