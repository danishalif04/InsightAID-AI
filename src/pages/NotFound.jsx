import { Link } from 'react-router-dom'
import { PATHS } from '@/routes/paths'

export default function NotFound() {
  return (
    <section className="flex h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-semibold text-brand-300 dark:text-brand-700">404</p>
      <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to={PATHS.dashboard}
        className="mt-6 rounded-lg bg-brand-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 dark:bg-accent-600 dark:hover:bg-accent-500"
      >
        Back to Dashboard
      </Link>
    </section>
  )
}
