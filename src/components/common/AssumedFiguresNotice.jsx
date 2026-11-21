import { Sparkles } from 'lucide-react'
import { describeAssumedFields } from '@/utils/illustrativeExample'

/**
 * Discloses exactly which figures in a panel were filled in for the owner
 * rather than entered by them (see src/utils/illustrativeExample.js's
 * `assumedFields`). Naming the specific fields is the point — a vague
 * "some data is sample data" banner would leave the owner unable to tell
 * which of their own numbers are real.
 */

/** @param {{assumedFields: string[], className?: string, children?: import('react').ReactNode}} props */
export default function AssumedFiguresNotice({ assumedFields = [], className = '', children }) {
  if (assumedFields.length === 0) return null

  return (
    <div className={`flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 ${className}`}>
      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-glow-text/70">
        <span className="font-semibold text-amber-400">Example figures in use</span>, you haven&apos;t entered your{' '}
        <span className="font-medium text-glow-text/90">{describeAssumedFields(assumedFields)}</span> yet, so sample values
        are standing in for now. Everything else below is your own data.{children ? ' ' : ''}
        {children}
      </p>
    </div>
  )
}
