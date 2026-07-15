/** Pulsing placeholder block for content awaiting an async fetch. */
export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-line dark:bg-line-dark ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
