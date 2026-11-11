import { isNum, ok, round } from './core'

/**
 * Capability matrix: what the owner has entered → which analytical tools
 * can actually run. A capability is NEVER reported ready unless its real
 * inputs exist, and a locked one always carries `needs` so the UI can say
 * what would unlock it instead of showing a disabled feature as if it
 * were operational.
 */

const countPricedProducts = (shop) => (shop?.products ?? []).filter((p) => isNum(p?.price) && isNum(p?.cost)).length
const totalFixed = (shop) =>
  (shop?.expenses ?? []).filter((e) => isNum(e?.amount) && e.kind !== 'variable').reduce((sum, e) => sum + e.amount, 0)

export function readiness(shop) {
  const products = shop?.products ?? []
  const priced = countPricedProducts(shop)
  const expenses = (shop?.expenses ?? []).filter((e) => isNum(e?.amount))
  const fixed = totalFixed(shop)
  const salesDays = (shop?.dailyRecords ?? []).length
  const feedback = (shop?.feedback ?? []).length
  const startupItems = Object.values(shop?.startupItems ?? {}).filter(isNum).length

  const capabilities = [
    {
      id: 'product_margin',
      label: 'Product margin',
      status: priced > 0 ? (priced === products.length ? 'ready' : 'partial') : 'locked',
      needs: priced > 0 ? (priced === products.length ? [] : ['cost and price on every product']) : ['product price + unit cost'],
    },
    {
      id: 'break_even',
      label: 'Break-even analysis',
      status: priced > 0 && fixed > 0 ? 'ready' : 'locked',
      needs: [!(priced > 0) && 'product price + unit cost', !(fixed > 0) && 'monthly fixed costs'].filter(Boolean),
    },
    {
      id: 'financial_planning',
      label: 'Financial planning',
      status: priced > 0 && expenses.length > 0 ? 'ready' : expenses.length > 0 || priced > 0 ? 'partial' : 'locked',
      needs: [!(priced > 0) && 'products with costs', !(expenses.length > 0) && 'expense records'].filter(Boolean),
    },
    {
      id: 'scenario_modelling',
      label: 'Scenario modelling',
      status: priced > 0 && fixed > 0 ? 'ready' : 'locked',
      needs: priced > 0 && fixed > 0 ? [] : ['break-even inputs'],
    },
    {
      id: 'startup_capital',
      label: 'Startup capital planning',
      status: startupItems > 0 ? 'ready' : 'locked',
      needs: startupItems > 0 ? [] : ['one-off setup costs'],
    },
    {
      id: 'sales_trend',
      label: 'Sales trend analysis',
      status: salesDays > 0 ? 'partial' : 'locked',
      needs: salesDays > 0 ? ['more recorded days'] : ['recorded daily sales'],
    },
    {
      id: 'forecasting',
      label: 'Forecasting',
      status: salesDays >= 90 ? 'partial' : 'locked',
      needs: salesDays >= 90 ? ['validation against a holdout period'] : ['about 3 months of daily sales'],
    },
    {
      id: 'sentiment',
      label: 'Sentiment analysis',
      status: feedback > 0 ? 'partial' : 'locked',
      needs: feedback > 0 ? ['more customer feedback'] : ['customer reviews or feedback'],
    },
  ]

  const score = capabilities.reduce((sum, c) => sum + (c.status === 'ready' ? 1 : c.status === 'partial' ? 0.5 : 0), 0)
  return ok({
    percent: round((score / capabilities.length) * 100, 0),
    capabilities,
    counts: { products: products.length, pricedProducts: priced, expenses: expenses.length, salesDays, feedback },
  })
}
