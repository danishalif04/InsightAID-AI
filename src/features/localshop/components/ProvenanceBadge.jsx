import { Calculator, FlaskConical, Pencil, Sparkles, UserPen, Wand2 } from 'lucide-react'
import { useLang } from '../i18n/useLang'

/**
 * Says where a number came from. Required on every figure in this
 * pathway: an owner must be able to tell a calculation from their own
 * input, from an assumption, from demo data, at a glance.
 */

const VARIANTS = {
  Calculated: { icon: Calculator, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  'Your input': { icon: UserPen, className: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  Assumption: { icon: FlaskConical, className: 'bg-amber-400/15 text-amber-400 border-amber-400/30' },
  'AI-explained': { icon: Sparkles, className: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  // Distinct from 'AI-explained': that one means a computed figure the model
  // put into words, this one means the INPUTS themselves were generated. It
  // shares the rose styling with Illustrative because both say the same
  // thing to an owner — these are not your own records.
  'AI-generated': { icon: Wand2, className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  Illustrative: { icon: Pencil, className: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
}

/** @param {{kind: keyof typeof VARIANTS, title?: string, className?: string}} props */
export default function ProvenanceBadge({ kind, title, className = '' }) {
  const { t } = useLang()
  const variant = VARIANTS[kind]
  if (!variant) return null
  const Icon = variant.icon

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${variant.className} ${className}`}
    >
      <Icon className="size-2.5" aria-hidden="true" />
      {t(`provenance.${kind}`)}
    </span>
  )
}
