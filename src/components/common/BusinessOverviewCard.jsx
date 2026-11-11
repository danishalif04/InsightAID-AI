import { Building2, Lightbulb, Sparkles } from 'lucide-react'
import StatTile from '@/components/ui/StatTile'
import { calculateBreakEven, calculateGrossMarginPercent, buildScenario } from '@/utils/scenarioEngine'
import { calculateReadiness } from '@/utils/dataReadiness'
import { calculateCapabilities } from '@/utils/capabilityMapping'
import { resolveDisplayAssumptions } from '@/utils/illustrativeExample'

/**
 * "My Business at a Glance" — Malaysian Local Shop's first screen after
 * onboarding (knowledge_updated_nov2026.md's Local Shop dashboard spec,
 * §A). Deliberately does NOT show historical revenue charts that don't
 * exist yet — only the business's own registered profile and planning
 * indicators, computed from the same already-tested scenarioEngine.js /
 * dataReadiness.js this app's Financial Planning page already uses.
 *
 * The "AI Business Insight" line is rule-based from the readiness
 * checklist, not an LLM call — same honesty convention as the
 * recommendation engine (explainable, deterministic, free to compute on
 * every page load).
 */

function buildNextStepInsight(readiness) {
  const unmet = readiness.checklist.find((item) => !item.met)
  if (!unmet) {
    return 'Your business profile, costs, and historical data are all on file — explore Forecasting and Sentiment Analysis for deeper insight.'
  }
  const metLabels = readiness.checklist.filter((item) => item.met).map((item) => item.label)
  const haveLine = metLabels.length > 0 ? `You have ${metLabels.join(', ').toLowerCase()} on file. ` : ''
  const NEXT_STEP_COPY = {
    business_plan: 'Finish your business profile and cost assumptions so planning figures can be calculated.',
    sales: 'The next useful step is to identify your best-selling products by recording daily sales.',
    reviews: 'The next useful step is to start collecting customer reviews or feedback.',
    social: 'The next useful step is to connect a social or marketplace data source.',
    historical: 'Keep recording data — at least 3 months of history unlocks trend and forecasting analysis.',
  }
  return `${haveLine}${NEXT_STEP_COPY[unmet.id] ?? 'Keep adding business data to unlock more analysis.'}`
}

function money(value) {
  return value === null || value === undefined ? undefined : value
}

/** @param {{values: object}} props business_profiles + business_assumptions, flattened (same shape as getProfile()'s `values`) */
export default function BusinessOverviewCard({ values = {} }) {
  const { values: displayValues, isIllustrative } = resolveDisplayAssumptions(values)
  const expected = buildScenario(displayValues, 'expected')
  const breakEven = calculateBreakEven(displayValues)
  const grossMarginPercent = calculateGrossMarginPercent(expected.revenue, expected.grossProfit)
  const readiness = calculateReadiness({ values })
  const capabilities = calculateCapabilities(readiness)
  const productsRegistered = values.number_of_products ?? (isIllustrative ? displayValues.number_of_products : undefined)

  const businessName = values.business_name || 'Your Business'
  const category = values.industry || values.product_category || null
  const location = values.location || null
  const operatingModel = values.business_model || null
  const subline = [category, location].filter(Boolean).join(' · ')

  return (
    <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-glow-brand/15">
            <Building2 className="size-5 text-glow-brand" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-glow-text/40">Business Profile</p>
            <h2 className="mt-0.5 text-lg font-semibold text-glow-text">{businessName}</h2>
            {subline && <p className="text-xs text-glow-text/60">{subline}</p>}
            {operatingModel && <p className="text-xs text-glow-text/40">{operatingModel}</p>}
          </div>
        </div>
        <span className="rounded-full bg-glow-brand/15 px-2.5 py-1 text-xs font-medium text-glow-brand">
          My Business at a Glance
        </span>
      </div>

      {isIllustrative && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-glow-text/70">
            <span className="font-semibold text-amber-400">Illustrative example</span> — the figures below use a
            sample price, cost, and fixed costs (RM20 price, RM13 cost per unit, RM2,500 fixed costs) so you can see
            what this dashboard looks like. Add your own via Onboarding or Settings to replace them with your real
            numbers.
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Products Registered"
          value={money(productsRegistered)}
          guide="Count of products/services you've registered in your business profile."
        />
        <StatTile
          label="Monthly Fixed Costs"
          value={money(expected.operatingCosts)}
          prefix="RM "
          decimals={2}
          guide="Sum of every operating-cost field you've entered — rent, salaries, utilities, and other recurring monthly costs."
        />
        <StatTile
          label="Average Product Margin"
          value={grossMarginPercent ?? undefined}
          unit="%"
          guide="Gross margin on your expected scenario: (Revenue − Variable Costs) ÷ Revenue, from your registered price and cost per unit."
        />
        <StatTile
          label="Monthly Break-even Sales"
          value={breakEven.insufficient ? undefined : breakEven.revenue}
          prefix="RM "
          decimals={2}
          guide="Estimated monthly sales revenue needed to cover your fixed costs, given your price and cost per unit."
        />
      </div>

      <div className="mt-5 rounded-2xl border border-glow-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-glow-text/80">Business Readiness</p>
          <span className="text-xs font-medium text-glow-brand">{readiness.percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-glow-brand transition-all" style={{ width: `${readiness.percent}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-glow-text/50">
          {readiness.checklist
            .filter((item) => item.met)
            .map((item) => item.label)
            .join(', ') || 'No business data on file yet'}{' '}
          {readiness.checklist.some((item) => item.met) ? 'available.' : ''}
          {readiness.checklist.some((item) => !item.met) &&
            ` ${readiness.checklist.filter((item) => !item.met).map((item) => item.label).join(', ')} still needed for fuller analysis.`}
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-1.5 border-t border-glow-border pt-3 sm:grid-cols-2">
          {capabilities.map((row) => (
            <li key={row.capability} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-glow-text/60">{row.capability}</span>
              <span className={row.available ? 'font-medium text-glow-brand' : 'text-glow-text/30'}>
                {row.available ? 'Available' : 'Not yet'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-glow-border bg-glow-brand/5 p-4">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-glow-brand" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-glow-text/80">InsightAid AI suggests</p>
          <p className="mt-1 text-xs leading-relaxed text-glow-text/60">{buildNextStepInsight(readiness)}</p>
        </div>
      </div>

    </div>
  )
}
