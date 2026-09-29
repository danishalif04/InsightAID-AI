/**
 * Business profile field schema (FYP2.md §24), grouped exactly as the spec
 * lists them. Drives the onboarding form, completeness calculation, and
 * client-side validation. `table` says which Supabase table physically
 * holds the field — the two tables are treated as one logical profile
 * everywhere else in the app.
 *
 * Kept deliberately as a small hand-written module rather than a schema
 * library (zod/ajv) — consistent with this codebase's existing avoidance
 * of unnecessary dependencies for a field list this size. The Supabase
 * Edge Function (supabase/functions/extract-business-profile) keeps its
 * own server-side copy of the extractable subset in sync by hand.
 */

export const PROVENANCE = {
  userProvided: 'user_provided',
  aiExtracted: 'ai_extracted',
  defaultAssumption: 'default_assumption',
}

export const PROVENANCE_META = {
  user_provided: { label: 'User provided', tone: 'brand' },
  ai_extracted: { label: 'AI extracted', tone: 'info' },
  default_assumption: { label: 'Default assumption', tone: 'neutral' },
}

export const PROFILE_GROUPS = [
  {
    id: 'business',
    label: 'Business',
    fields: [
      { id: 'business_name', label: 'Business Name', table: 'profile', type: 'text' },
      { id: 'business_type', label: 'Business Type', table: 'profile', type: 'text' },
      { id: 'industry', label: 'Industry', table: 'profile', type: 'text' },
      { id: 'business_stage', label: 'Business Stage', table: 'profile', type: 'text' },
      { id: 'location', label: 'Location / Market', table: 'profile', type: 'text' },
      { id: 'business_model', label: 'Business Model', table: 'profile', type: 'text' },
    ],
  },
  {
    id: 'product',
    label: 'Product / Service',
    fields: [
      { id: 'product_category', label: 'Category', table: 'profile', type: 'text' },
      { id: 'product_type', label: 'Product Type', table: 'profile', type: 'text' },
      { id: 'selling_price', label: 'Selling Price (RM)', table: 'assumptions', type: 'number' },
      { id: 'cost_per_unit', label: 'Cost per Unit (RM)', table: 'assumptions', type: 'number' },
      { id: 'expected_margin', label: 'Expected Margin (%)', table: 'assumptions', type: 'number' },
      { id: 'number_of_products', label: 'Number of Products', table: 'assumptions', type: 'number' },
    ],
  },
  {
    id: 'market',
    label: 'Market',
    fields: [
      { id: 'target_customer', label: 'Target Customer', table: 'profile', type: 'text' },
      { id: 'target_age_group', label: 'Target Age Group', table: 'profile', type: 'text' },
      { id: 'target_location', label: 'Target Location', table: 'profile', type: 'text' },
      { id: 'customer_segment', label: 'Customer Segment', table: 'profile', type: 'text' },
    ],
  },
  {
    id: 'sales',
    label: 'Sales Assumptions',
    fields: [
      { id: 'expected_monthly_units', label: 'Expected Monthly Units', table: 'assumptions', type: 'number' },
      { id: 'expected_monthly_revenue', label: 'Expected Monthly Revenue (RM)', table: 'assumptions', type: 'number' },
      { id: 'expected_growth_rate', label: 'Expected Growth Rate (%)', table: 'assumptions', type: 'number' },
      { id: 'expected_conversion_rate', label: 'Expected Conversion Rate (%)', table: 'assumptions', type: 'number' },
      {
        id: 'expected_repeat_purchase_rate',
        label: 'Expected Repeat Purchase Rate (%)',
        table: 'assumptions',
        type: 'number',
      },
    ],
  },
  {
    id: 'costs',
    label: 'Operating Costs',
    fields: [
      { id: 'marketing_cost', label: 'Marketing Cost (RM)', table: 'assumptions', type: 'number' },
      { id: 'platform_fees', label: 'Platform Fees (RM)', table: 'assumptions', type: 'number' },
      { id: 'shipping_cost', label: 'Shipping (RM)', table: 'assumptions', type: 'number' },
      { id: 'labour_cost', label: 'Labour (RM)', table: 'assumptions', type: 'number' },
      { id: 'fixed_costs', label: 'Monthly Fixed Costs (RM)', table: 'assumptions', type: 'number' },
      { id: 'other_expenses', label: 'Other Expenses (RM)', table: 'assumptions', type: 'number' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    fields: [
      {
        id: 'marketing_channels',
        label: 'Marketing Channels',
        table: 'profile',
        type: 'multiselect',
        options: ['TikTok', 'Shopee', 'X', 'Threads', 'Instagram', 'Facebook', 'Word of mouth'],
      },
    ],
  },
  {
    id: 'goals',
    label: 'Business Goals',
    fields: [
      { id: 'revenue_target', label: 'Revenue Target (RM)', table: 'profile', type: 'number' },
      { id: 'sales_target', label: 'Sales Target (units)', table: 'profile', type: 'number' },
      { id: 'customer_target', label: 'Customer Target', table: 'profile', type: 'number' },
      { id: 'launch_date', label: 'Launch Date', table: 'profile', type: 'date' },
      { id: 'growth_target', label: 'Growth Target', table: 'profile', type: 'text' },
    ],
  },
]

export const ALL_FIELDS = PROFILE_GROUPS.flatMap((group) => group.fields)
export const FIELDS_BY_ID = Object.fromEntries(ALL_FIELDS.map((field) => [field.id, field]))

/** The reliably-extractable subset of ALL_FIELDS the Gemini prompt asks for. */
export const EXTRACTABLE_FIELD_IDS = [
  'business_name',
  'business_type',
  'industry',
  'business_stage',
  'location',
  'product_category',
  'product_type',
  'target_customer',
  'target_age_group',
  'marketing_channels',
  'selling_price',
  'expected_monthly_units',
  'expected_monthly_revenue',
  'marketing_cost',
  'growth_target',
]

function isFilled(value) {
  if (value === null || value === undefined || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

/** { percent, missing: Field[] } across every field, per FYP2.md §26. */
export function calculateCompleteness(values) {
  const missing = ALL_FIELDS.filter((field) => !isFilled(values[field.id]))
  const percent = Math.round(((ALL_FIELDS.length - missing.length) / ALL_FIELDS.length) * 100)
  return { percent, missing }
}

/** Splits a flat { fieldId: value } object into the two physical table payloads. */
export function splitByTable(values) {
  const profile = {}
  const assumptions = {}
  for (const field of ALL_FIELDS) {
    if (!(field.id in values)) continue
    ;(field.table === 'assumptions' ? assumptions : profile)[field.id] = values[field.id]
  }
  return { profile, assumptions }
}

/** Coerces + validates one raw form value against its field definition. Never throws. */
export function validateFieldValue(fieldId, rawValue) {
  const field = FIELDS_BY_ID[fieldId]
  if (!field) return { valid: false, value: null, error: 'Unknown field.' }
  if (!isFilled(rawValue)) return { valid: true, value: null }

  if (field.type === 'number') {
    const value = typeof rawValue === 'number' ? rawValue : Number.parseFloat(rawValue)
    if (!Number.isFinite(value)) return { valid: false, value: null, error: `${field.label} must be a number.` }
    return { valid: true, value }
  }

  if (field.type === 'date') {
    const value = String(rawValue)
    if (Number.isNaN(new Date(value).getTime())) return { valid: false, value: null, error: `${field.label} must be a valid date.` }
    return { valid: true, value }
  }

  if (field.type === 'multiselect') {
    const value = Array.isArray(rawValue) ? rawValue.filter((item) => field.options.includes(item)) : []
    return { valid: true, value }
  }

  return { valid: true, value: String(rawValue).trim() }
}
