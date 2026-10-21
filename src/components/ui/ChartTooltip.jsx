/**
 * Shared Recharts tooltip content — a small color dot carries series identity,
 * all text stays in neutral ink tokens (never the series color itself).
 * Restyled for the premium-redesign chart kit (src/components/charts/):
 * slightly larger surface, tabular numerals so stacked values align, a
 * thin top accent bar colored by the first series (purely decorative,
 * never the sole carrier of meaning — the dot + label text still do that).
 */
export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="min-w-[9rem] overflow-hidden rounded-lg border border-line bg-surface shadow-card dark:border-line-dark dark:bg-surface-dark">
      <div
        className="h-0.5 w-full"
        style={{ backgroundColor: payload[0]?.color ?? 'transparent' }}
        aria-hidden="true"
      />
      <div className="px-3 py-2.5 text-xs">
        {label && <p className="mb-1.5 font-medium text-slate-700 dark:text-slate-200">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry) => (
            <div key={entry.dataKey ?? entry.name} className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className="text-slate-500 dark:text-slate-400">{entry.name}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums text-slate-700 dark:text-slate-200">
                {formatter ? formatter(entry.value, entry.name) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
