/**
 * Validator for an AI-generated Local Shop scenario.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The Local Shop pathway renders every page from one shop object held in
 * ShopProvider (src/features/localshop/store/ShopProvider.jsx). `loadDemo()`
 * puts the hand-written Kedai Makmur fixture there; this module lets a
 * generated scenario take the same slot, so Business Overview, What-If
 * Simulator, Products & Pricing, Financial Planning and Startup Capital all
 * work unchanged.
 *
 * THE RULE THIS FILE ENFORCES
 * ---------------------------
 * The LLM supplies INPUTS ONLY. Every displayed figure — contribution
 * margin, break-even, cost pressure, capital gap, runway — is computed by
 * src/features/localshop/engine/* from those inputs, exactly as it is for
 * the hand-written fixture.
 *
 * That is the project's architectural claim ("the engine computes every
 * number; the LLM only chooses tools and phrases the result"), and
 * CLAUDE.md's honesty rule makes it non-negotiable: a margin or break-even
 * produced by a language model would be an invented metric displayed as a
 * computed one. So any such key arriving from the model is STRIPPED and
 * reported, never passed through. See FORBIDDEN_COMPUTED_KEYS.
 *
 * Pure functions only — no Supabase, no React, no network (CLAUDE.md:
 * "pure logic in src/utils/*.js with matching Vitest tests").
 */

/** Keys the engine derives. If the model returns one, it is dropped, not trusted. */
export const FORBIDDEN_COMPUTED_KEYS = Object.freeze([
  'margin',
  'marginPct',
  'grossMargin',
  'averageMargin',
  'breakEven',
  'breakEvenUnits',
  'breakEvenRevenue',
  'contribution',
  'contributionPerUnit',
  'dailyTarget',
  'runway',
  'cashRunway',
  'capitalGap',
  'gap',
  'forecast',
  'projection',
  'totalExpenses',
  'monthlyFixed',
])

/** Startup-cost buckets the Startup Capital page understands. */
export const STARTUP_ITEM_KEYS = Object.freeze([
  'rental_deposit',
  'renovation',
  'equipment',
  'initial_stock',
  'licences',
  'utilities_deposit',
  'marketing',
  'emergency_reserve',
])

export const LIMITS = Object.freeze({
  minProducts: 3,
  maxProducts: 60,
  minExpenses: 1,
  maxExpenses: 30,
  maxNameLength: 80,
  maxDescriptionLength: 2000,
  maxAmount: 10_000_000,
})

const EXPENSE_KINDS = Object.freeze(['fixed', 'variable'])

/** Finite, non-NaN number. `true`, `null` and `'5'` are all rejected: no coercion. */
function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Trimmed non-empty string capped at `maxLength`, or null. */
function cleanString(value, maxLength) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

/** Money rounded to sen, so 0.1 + 0.2 artefacts never reach the engine. */
export function roundMoney(value) {
  return Math.round(value * 100) / 100
}

/**
 * Slug for a product/expense id. The model is not asked for ids — they are
 * derived here so two scenarios cannot collide on a hand-picked id, and so
 * a careless id string cannot reach React keys or localStorage.
 */
export function slugify(text, fallback) {
  const slug = String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return slug || fallback
}

/** Appends -2, -3 … so ids stay unique within one scenario. */
function uniqueId(base, seen) {
  let id = base
  let n = 2
  while (seen.has(id)) {
    id = `${base}-${n}`
    n += 1
  }
  seen.add(id)
  return id
}

function stripComputedKeys(object, path, warnings) {
  if (!object || typeof object !== 'object') return object
  const copy = { ...object }
  for (const key of FORBIDDEN_COMPUTED_KEYS) {
    if (key in copy) {
      delete copy[key]
      warnings.push(`${path}.${key} was dropped: the engine computes it, the model must not supply it.`)
    }
  }
  return copy
}

/**
 * One product row. Rejects rather than repairs: a price at or below cost is
 * a scenario the model got wrong, and silently "fixing" it would invent a
 * margin the model never intended.
 */
function validateProduct(raw, index, seenIds, errors, warnings) {
  const where = `products[${index}]`
  if (!raw || typeof raw !== 'object') {
    errors.push(`${where} is not an object.`)
    return null
  }
  const cleaned = stripComputedKeys(raw, where, warnings)

  const name = cleanString(cleaned.name, LIMITS.maxNameLength)
  if (!name) {
    errors.push(`${where}.name is missing or empty.`)
    return null
  }

  const unit = cleanString(cleaned.unit, 24) ?? 'unit'

  if (!isFiniteNumber(cleaned.cost)) {
    errors.push(`${where}.cost must be a number (got ${JSON.stringify(cleaned.cost)}).`)
    return null
  }
  if (!isFiniteNumber(cleaned.price)) {
    errors.push(`${where}.price must be a number (got ${JSON.stringify(cleaned.price)}).`)
    return null
  }
  const cost = roundMoney(cleaned.cost)
  const price = roundMoney(cleaned.price)

  if (cost <= 0) {
    errors.push(`${where}.cost must be greater than 0 (got ${cost}).`)
    return null
  }
  if (price <= cost) {
    errors.push(`${where}.price (${price}) must be greater than cost (${cost}), a non-positive margin is not a usable scenario.`)
    return null
  }
  if (price > LIMITS.maxAmount) {
    errors.push(`${where}.price (${price}) exceeds the maximum of ${LIMITS.maxAmount}.`)
    return null
  }

  return { id: uniqueId(slugify(name, `p-${index + 1}`), seenIds), name, unit, cost, price }
}

function validateExpense(raw, index, seenIds, errors, warnings) {
  const where = `expenses[${index}]`
  if (!raw || typeof raw !== 'object') {
    errors.push(`${where} is not an object.`)
    return null
  }
  const cleaned = stripComputedKeys(raw, where, warnings)

  const category = cleanString(cleaned.category, LIMITS.maxNameLength)
  if (!category) {
    errors.push(`${where}.category is missing or empty.`)
    return null
  }
  if (!isFiniteNumber(cleaned.amount)) {
    errors.push(`${where}.amount must be a number (got ${JSON.stringify(cleaned.amount)}).`)
    return null
  }
  const amount = roundMoney(cleaned.amount)
  if (amount <= 0) {
    errors.push(`${where}.amount must be greater than 0 (got ${amount}).`)
    return null
  }
  if (amount > LIMITS.maxAmount) {
    errors.push(`${where}.amount (${amount}) exceeds the maximum of ${LIMITS.maxAmount}.`)
    return null
  }

  // Anything not explicitly "variable" is treated as fixed, matching
  // engine/expenses.js's own `item.kind !== 'variable'` rule. Kept in sync
  // deliberately: break-even is computed against the fixed total, so a row
  // mis-typed as variable would understate it.
  const kind = EXPENSE_KINDS.includes(cleaned.kind) ? cleaned.kind : 'fixed'
  if (!EXPENSE_KINDS.includes(cleaned.kind)) {
    warnings.push(`${where}.kind was ${JSON.stringify(cleaned.kind)}; defaulted to "fixed".`)
  }

  return {
    id: uniqueId(`e-${slugify(category, `expense-${index + 1}`)}`, seenIds),
    category,
    amount,
    kind,
    controllable: cleaned.controllable === true,
  }
}

function validateStartupItems(raw, errors, warnings) {
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    errors.push('startupItems must be an object of named one-off costs.')
    return {}
  }
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!STARTUP_ITEM_KEYS.includes(key)) {
      warnings.push(`startupItems.${key} is not a recognised bucket and was dropped.`)
      continue
    }
    if (!isFiniteNumber(value) || value < 0 || value > LIMITS.maxAmount) {
      errors.push(`startupItems.${key} must be a number between 0 and ${LIMITS.maxAmount} (got ${JSON.stringify(value)}).`)
      continue
    }
    out[key] = roundMoney(value)
  }
  return out
}

/**
 * Validates a model-generated scenario into a shop object the Local Shop
 * pages can render.
 *
 * Returns `{ ok: true, shop, warnings }` or `{ ok: false, errors, warnings }`.
 * Never throws, and never returns a partially-valid shop: a scenario with
 * any error is rejected whole, because half a scenario rendered across five
 * pages is worse than an honest failure message.
 *
 * @param {unknown} raw       parsed JSON from the model
 * @param {object} [profile]  the user's own three onboarding answers, which
 *                            take precedence over anything the model echoes
 * @returns {{ok: true, shop: object, warnings: string[]} | {ok: false, errors: string[], warnings: string[]}}
 */
export function validateShopScenario(raw, profile = {}) {
  const errors = []
  const warnings = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Scenario must be a JSON object.'], warnings }
  }

  const root = stripComputedKeys(raw, 'scenario', warnings)

  const name = cleanString(root.name, LIMITS.maxNameLength)
  if (!name) errors.push('name is missing or empty.')

  const products = []
  const productIds = new Set()
  if (!Array.isArray(root.products)) {
    errors.push('products must be an array.')
  } else {
    if (root.products.length < LIMITS.minProducts) {
      errors.push(`products must contain at least ${LIMITS.minProducts} items (got ${root.products.length}).`)
    }
    if (root.products.length > LIMITS.maxProducts) {
      errors.push(`products must contain at most ${LIMITS.maxProducts} items (got ${root.products.length}).`)
    }
    root.products.slice(0, LIMITS.maxProducts).forEach((item, i) => {
      const product = validateProduct(item, i, productIds, errors, warnings)
      if (product) products.push(product)
    })
  }

  const expenses = []
  const expenseIds = new Set()
  if (!Array.isArray(root.expenses)) {
    errors.push('expenses must be an array.')
  } else {
    if (root.expenses.length < LIMITS.minExpenses) {
      errors.push(`expenses must contain at least ${LIMITS.minExpenses} item (got ${root.expenses.length}).`)
    }
    root.expenses.slice(0, LIMITS.maxExpenses).forEach((item, i) => {
      const expense = validateExpense(item, i, expenseIds, errors, warnings)
      if (expense) expenses.push(expense)
    })
  }

  // At least one FIXED row is required: engine/breakEven.js divides by the
  // fixed total, and a scenario with none would render a break-even of zero
  // — a figure that looks computed but actually means "no data".
  if (expenses.length > 0 && !expenses.some((e) => e.kind === 'fixed')) {
    errors.push('expenses must include at least one fixed cost, break-even is computed against the fixed total.')
  }

  const startupItems = validateStartupItems(root.startupItems, errors, warnings)

  let availableCapital = null
  if (root.availableCapital !== undefined && root.availableCapital !== null) {
    if (!isFiniteNumber(root.availableCapital) || root.availableCapital < 0) {
      errors.push(`availableCapital must be a non-negative number (got ${JSON.stringify(root.availableCapital)}).`)
    } else {
      availableCapital = roundMoney(root.availableCapital)
    }
  }

  // The user's own three answers win over the model's echo of them. The
  // model is asked to build a shop AROUND this profile, not to restate it.
  const revenueTargetSource = profile.revenueTarget ?? root.revenueTarget
  let revenueTarget = null
  if (revenueTargetSource !== undefined && revenueTargetSource !== null) {
    if (!isFiniteNumber(revenueTargetSource) || revenueTargetSource <= 0) {
      errors.push(`revenueTarget must be a positive number (got ${JSON.stringify(revenueTargetSource)}).`)
    } else {
      revenueTarget = roundMoney(revenueTargetSource)
    }
  }

  if (errors.length > 0) return { ok: false, errors, warnings }

  const shop = {
    id: `generated-${slugify(name, 'shop')}`,

    // Provenance, deliberately belt-and-braces:
    //   `illustrative: true` keeps the EXISTING red ribbon on every screen
    //     even before any AI-specific UI exists, so a generated scenario can
    //     never render unlabelled.
    //   `provenance: 'ai-generated'` lets the UI say something more precise.
    // A generated shop is NOT the owner's own records and must never be
    // presented as them.
    illustrative: true,
    provenance: 'ai-generated',
    generatedAt: new Date().toISOString(),

    name,
    category: cleanString(root.category, LIMITS.maxNameLength) ?? 'Local shop',
    location: cleanString(root.location, LIMITS.maxNameLength) ?? 'Malaysia',
    model: cleanString(root.model, LIMITS.maxNameLength) ?? 'Walk-in retail',
    currency: 'MYR',
    language: root.language === 'en' ? 'en' : 'ms',

    sector: cleanString(profile.sector ?? root.sector, LIMITS.maxNameLength) ?? null,
    revenueTarget,
    description: cleanString(profile.description ?? root.description, LIMITS.maxDescriptionLength) ?? null,

    products,
    expenses,
    startupItems,
    availableCapital,

    cash: null,
    monthlyOutflow: null,

    // Always empty. This pathway exists precisely because the shop has no
    // sales history, and fabricating daily records or customer feedback
    // would be inventing research data (CLAUDE.md: never fabricate
    // scraped/live data). Locked capabilities stay locked.
    dailyRecords: [],
    feedback: [],
  }

  return { ok: true, shop, warnings }
}
