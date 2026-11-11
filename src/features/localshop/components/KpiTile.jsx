import ProvenanceBadge from './ProvenanceBadge'
import { useLang } from '../i18n/useLang'

/**
 * One planning figure with its provenance. A null/undefined `value`
 * renders the "not enough information" line rather than a zero, so a
 * missing input is never mistaken for a real result of zero.
 */
export default function KpiTile({ label, value, prefix = '', suffix = '', provenance, hint, needs }) {
  const { t } = useLang()
  const hasValue = value !== null && value !== undefined && value !== ''

  return (
    <div className="rounded-2xl border border-glow-border bg-glow-surface-elevated p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-glow-text/50">{label}</p>
        {provenance && <ProvenanceBadge kind={provenance} />}
      </div>

      {hasValue ? (
        <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-glow-text">
          {prefix}
          {value}
          {suffix && <span className="ml-1 text-sm font-normal text-glow-text/50">{suffix}</span>}
        </p>
      ) : (
        <p className="mt-2 text-sm text-glow-text/40">{t('common.notEnough')}</p>
      )}

      {!hasValue && needs?.length > 0 && (
        <p className="mt-1 text-[11px] text-glow-text/40">
          {t('readiness.needs')}: {needs.join(', ')}
        </p>
      )}
      {hasValue && hint && <p className="mt-1 text-[11px] text-glow-text/40">{hint}</p>}
    </div>
  )
}
