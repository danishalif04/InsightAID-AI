import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Sparkles, Store } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import KpiTile from '../components/KpiTile'
import ToolCard from '../components/ToolCard'
import ProvenanceBadge from '../components/ProvenanceBadge'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { LOCAL_SHOP_PATHS } from '../paths'
import { breakEvenRevenueMulti, dailyTarget, marginTable, monthlyExpenses, readiness } from '../engine'
import { nextStepFor } from '../engine/nextStep'

const money = (value) => `RM${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 0 })}`

export default function Overview() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { shop, hasShop, isDemo, loadDemo } = useShop()

  const model = useMemo(() => {
    if (!shop) return null
    const expenses = monthlyExpenses(shop.expenses)
    const fixed = expenses.ok ? expenses.fixed : null
    const bep = fixed !== null ? breakEvenRevenueMulti(fixed, shop.products) : { ok: false }
    const ready = readiness(shop)
    const margins = marginTable(shop.products)

    // Daily target in RM, derived from the monthly break-even revenue.
    const daily = bep.ok ? dailyTarget(bep.value) : { ok: false }

    return { expenses, fixed, bep, ready, margins, daily, nextStep: nextStepFor(ready) }
  }, [shop])

  if (!hasShop) {
    return (
      <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-6">
        <EmptyState
          icon={Store}
          message={t('overview.empty')}
          actionLabel={t('overview.loadDemo')}
          onAction={loadDemo}
        />
      </div>
    )
  }

  const { expenses, fixed, bep, ready, margins, daily, nextStep } = model

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-glow-text/40">
              {t('overview.title')}
            </p>
            <h1 className="mt-0.5 text-xl font-semibold text-glow-text">{shop.name}</h1>
            <p className="text-xs text-glow-text/60">
              {[shop.category, shop.location].filter(Boolean).join(' · ')}
            </p>
            {shop.model && <p className="text-[11px] text-glow-text/40">{shop.model}</p>}
          </div>
          {isDemo && <ProvenanceBadge kind="Illustrative" title={t('common.illustrative')} />}
        </div>
        <p className="mt-3 text-xs text-glow-text/50">{t('overview.subtitle')}</p>
      </div>

      {/* Planning indicators */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label={t('overview.products')}
          value={shop.products?.length ?? 0}
          provenance={isDemo ? 'Illustrative' : 'Your input'}
        />
        <KpiTile
          label={t('overview.fixedCosts')}
          value={fixed !== null ? money(fixed) : null}
          provenance="Calculated"
          needs={['monthly expenses']}
        />
        <KpiTile
          label={t('overview.avgMargin')}
          value={bep.ok ? bep.avgMarginPct : null}
          suffix="%"
          provenance="Calculated"
          hint="Unweighted — equal sales mix assumed"
          needs={['product price + unit cost']}
        />
        <KpiTile
          label={t('overview.breakEven')}
          value={bep.ok ? money(bep.value) : null}
          provenance="Calculated"
          hint={daily.ok ? `${money(daily.value)}${t('common.perDay')}` : undefined}
          needs={['fixed costs', 'product margins']}
        />
      </div>

      {/* Readiness ladder */}
      <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-glow-text">{t('overview.readiness')}</p>
          <span className="text-xs font-medium text-glow-brand">{ready.percent}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-glow-brand transition-all" style={{ width: `${ready.percent}%` }} />
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ready.capabilities.map((capability) => (
            <li key={capability.id} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-glow-text/60">{capability.label}</span>
              <span
                className={
                  capability.status === 'ready'
                    ? 'font-medium text-emerald-400'
                    : capability.status === 'partial'
                      ? 'font-medium text-amber-400'
                      : 'text-glow-text/30'
                }
                title={capability.needs.join(', ')}
              >
                {t(`readiness.${capability.status}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Rule-based next step (no LLM call — free on every page load) */}
      <div className="flex items-start gap-2.5 rounded-3xl border border-glow-border bg-glow-brand/5 p-5">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-glow-brand" aria-hidden="true" />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-glow-text/80">{t('overview.suggests')}</p>
            <ProvenanceBadge kind="Calculated" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-glow-text/60">{nextStep}</p>
          <Button
            variant="glowSecondary"
            size="sm"
            icon={Sparkles}
            className="mt-3"
            onClick={() => navigate(LOCAL_SHOP_PATHS.assistant)}
          >
            {t('common.askAi')}
          </Button>
        </div>
      </div>

      {/* Analysis tool grid */}
      <div>
        <p className="mb-2 text-sm font-semibold text-glow-text">{t('overview.tools')}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ready.capabilities.map((capability) => {
            const route = TOOL_ROUTES[capability.id]
            return (
              <ToolCard
                key={capability.id}
                title={capability.label}
                status={capability.status}
                needs={capability.needs}
                tags={capability.status === 'locked' ? [] : ['Calculated']}
                to={route}
                onAskAi={route ? () => navigate(LOCAL_SHOP_PATHS.assistant) : undefined}
              >
                <ToolPreview id={capability.id} margins={margins} expenses={expenses} bep={bep} />
              </ToolCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TOOL_ROUTES = {
  product_margin: LOCAL_SHOP_PATHS.products,
  break_even: LOCAL_SHOP_PATHS.financial,
  financial_planning: LOCAL_SHOP_PATHS.financial,
  scenario_modelling: LOCAL_SHOP_PATHS.whatif,
  startup_capital: LOCAL_SHOP_PATHS.capital,
}

/** Tiny inline summary per tool — a real figure, or nothing. */
function ToolPreview({ id, margins, expenses, bep }) {
  if (id === 'product_margin' && margins.rows.length > 0) {
    const top = margins.rows[0]
    return (
      <p className="text-xs text-glow-text/60">
        Top margin: <span className="font-medium text-glow-text">{top.name}</span> · {top.marginPct}%
      </p>
    )
  }
  if ((id === 'break_even' || id === 'scenario_modelling') && bep.ok) {
    return <p className="text-xs text-glow-text/60">Break-even: {money(bep.value)}/month</p>
  }
  if (id === 'financial_planning' && expenses.ok) {
    return <p className="text-xs text-glow-text/60">Expenses: {money(expenses.total)}/month</p>
  }
  return null
}
