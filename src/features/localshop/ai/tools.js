import {
  breakEvenRevenueMulti,
  breakEvenUnits,
  dailyTarget,
  marginTable,
  monthlyExpenses,
  priceChangeImpact,
  readiness,
  startupCapital,
  costPressure,
} from '../engine'

/**
 * The controlled tool registry. Every tool is a thin wrapper over the
 * deterministic engine — the LLM selects which to run and explains what
 * comes back, but never computes anything itself.
 *
 * Tool results are compact (short keys, no raw rows) because they go back
 * into a prompt; the screen reads the same objects for its own display.
 */

const fixedCostsOf = (shop) => {
  const expenses = monthlyExpenses(shop?.expenses)
  return expenses.ok ? expenses.fixed : null
}

const topProduct = (shop) => marginTable(shop?.products).rows[0] ?? null

export const TOOLS = {
  check_readiness: {
    description: 'Which business information exists and which analytical capabilities it unlocks. No input.',
    params: {},
    run: (shop) => {
      const result = readiness(shop)
      return {
        percent: result.percent,
        ready: result.capabilities.filter((c) => c.status === 'ready').map((c) => c.id),
        locked: result.capabilities.filter((c) => c.status === 'locked').map((c) => ({ id: c.id, needs: c.needs })),
      }
    },
  },

  calculate_monthly_expenses: {
    description: 'Total recorded monthly expenses, split fixed vs variable, with a per-category share. No input.',
    params: {},
    run: (shop) => {
      const result = monthlyExpenses(shop?.expenses)
      if (!result.ok) return result
      return {
        total: result.total,
        fixed: result.fixed,
        variable: result.variable,
        top: result.byCategory.slice(0, 5).map((row) => ({ c: row.category, a: row.amount, p: row.sharePct })),
      }
    },
  },

  calculate_break_even: {
    description: 'Monthly break-even sales revenue, units and daily target. No input — uses recorded fixed costs and product margins.',
    params: {},
    run: (shop) => {
      const fixed = fixedCostsOf(shop)
      if (fixed === null) return { ok: false, missing: ['fixed costs'] }
      const revenue = breakEvenRevenueMulti(fixed, shop?.products)
      if (!revenue.ok) return revenue
      const reference = topProduct(shop)
      const units = reference ? breakEvenUnits(fixed, reference.price, reference.cost) : { ok: false }
      const daily = units.ok ? dailyTarget(units.value) : { ok: false }
      return {
        fixed,
        revenue: revenue.value,
        avgMarginPct: revenue.avgMarginPct,
        units: units.ok ? units.value : null,
        dailyUnits: daily.ok ? daily.value : null,
        assumptions: revenue.assumptions,
      }
    },
  },

  calculate_product_margin: {
    description: 'Gross margin per product, ranked highest first. No input.',
    params: {},
    run: (shop) => {
      const table = marginTable(shop?.products)
      return {
        count: table.rows.length,
        top: table.rows.slice(0, 5).map((row) => ({ n: row.name, m: row.marginPct, p: row.price, c: row.cost })),
        lowest: table.rows.slice(-3).map((row) => ({ n: row.name, m: row.marginPct })),
        note: table.note,
      }
    },
  },

  simulate_price_change: {
    description: 'Recalculates margin and break-even at a hypothetical selling price. Input: product_name (string), new_price (number).',
    params: { product_name: 'string', new_price: 'number' },
    run: (shop, args) => {
      const product =
        (shop?.products ?? []).find((p) => p.name?.toLowerCase() === String(args?.product_name ?? '').toLowerCase()) ??
        topProduct(shop)
      if (!product) return { ok: false, missing: ['product'] }
      return priceChangeImpact(product, Number(args?.new_price), fixedCostsOf(shop))
    },
  },

  calculate_startup_capital: {
    description: 'Total setup capital needed, operating buffer and any funding gap. Input: available_capital (number, optional).',
    params: { available_capital: 'number?' },
    run: (shop, args) => {
      const available = Number.isFinite(Number(args?.available_capital))
        ? Number(args.available_capital)
        : shop?.availableCapital
      const result = startupCapital(shop?.startupItems, { availableCapital: available, monthlyFixed: fixedCostsOf(shop) })
      if (!result.ok) return result
      return {
        total: result.total,
        cashNeeded: result.cashNeeded,
        monthsBuffer: result.monthsBuffer,
        availableCapital: result.availableCapital ?? null,
        gap: result.gap ?? null,
        shortfall: result.shortfall ?? null,
        missing: result.missingCategories,
        assumptions: result.assumptions,
      }
    },
  },

  analyse_cost_exposure: {
    description: 'Margin impact of a cost increase on one product. Input: product_name (string), increase_pct (number).',
    params: { product_name: 'string', increase_pct: 'number' },
    run: (shop, args) => {
      const product =
        (shop?.products ?? []).find((p) => p.name?.toLowerCase() === String(args?.product_name ?? '').toLowerCase()) ??
        topProduct(shop)
      if (!product) return { ok: false, missing: ['product'] }
      const pct = Number(args?.increase_pct ?? 10)
      const newCost = Math.round(product.cost * (1 + pct / 100) * 100) / 100
      return costPressure(product.price, product.cost, newCost)
    },
  },

  generate_business_plan: {
    description: 'A structured summary built only from confirmed inputs. No input.',
    params: {},
    run: (shop) => {
      const expenses = monthlyExpenses(shop?.expenses)
      const fixed = expenses.ok ? expenses.fixed : null
      const bep = fixed !== null ? breakEvenRevenueMulti(fixed, shop?.products) : { ok: false }
      const ready = readiness(shop)
      return {
        business: { name: shop?.name ?? null, category: shop?.category ?? null, location: shop?.location ?? null },
        products: shop?.products?.length ?? 0,
        monthlyExpenses: expenses.ok ? expenses.total : null,
        fixedCosts: fixed,
        breakEvenRevenue: bep.ok ? bep.value : null,
        avgMarginPct: bep.ok ? bep.avgMarginPct : null,
        readinessPct: ready.percent,
        unlocked: ready.capabilities.filter((c) => c.status === 'ready').map((c) => c.label),
        stillNeeded: ready.capabilities.filter((c) => c.status === 'locked').map((c) => c.label),
      }
    },
  },
}

export const TOOL_NAMES = Object.keys(TOOLS)

/** Validates a tool call before it runs: unknown tool, or a required param missing/mistyped. */
export function validateToolCall(name, args = {}) {
  const tool = TOOLS[name]
  if (!tool) return { valid: false, errors: [`Unknown tool "${name}".`] }

  const errors = []
  for (const [key, type] of Object.entries(tool.params)) {
    const optional = type.endsWith('?')
    const base = optional ? type.slice(0, -1) : type
    const value = args?.[key]
    if (value === undefined || value === null || value === '') {
      if (!optional) errors.push(`Missing "${key}" for ${name}.`)
      continue
    }
    if (base === 'number' && !Number.isFinite(Number(value))) errors.push(`"${key}" must be a number.`)
  }
  return { valid: errors.length === 0, errors }
}

/** Runs a validated tool against the shop. Never throws — a failure is data. */
export function runTool(name, shop, args = {}) {
  const check = validateToolCall(name, args)
  if (!check.valid) return { ok: false, errors: check.errors }
  try {
    return TOOLS[name].run(shop, args)
  } catch (error) {
    return { ok: false, errors: [String(error)] }
  }
}

/** Compact digest of the shop for the planning prompt — counts and totals, never raw rows. */
export function shopDigest(shop) {
  const expenses = monthlyExpenses(shop?.expenses)
  return {
    name: shop?.name ?? null,
    category: shop?.category ?? null,
    products: shop?.products?.length ?? 0,
    hasPrices: (shop?.products ?? []).some((p) => Number.isFinite(p?.price)),
    hasCosts: (shop?.products ?? []).some((p) => Number.isFinite(p?.cost)),
    monthlyExpenses: expenses.ok ? expenses.total : null,
    hasStartupItems: Object.values(shop?.startupItems ?? {}).some((v) => Number.isFinite(v)),
    salesDays: (shop?.dailyRecords ?? []).length,
  }
}
