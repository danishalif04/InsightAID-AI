/**
 * Controlled tool registry for the Agent Orchestrator foundation slice
 * (docs/AUDIT_v3_agentic_direction.md backlog item 5 — a minimal real
 * Manager Agent + ONE controlled tool, not the full multi-agent
 * architecture from knowledge_updated_nov2026.md §14.6-14.9).
 *
 * Deliberately duplicated (not imported) by
 * supabase/functions/agent-manager/index.ts, since Edge Functions run on
 * Deno and can't import from src/ — see that file's own header comment.
 * This copy exists so the registry is pure, testable, and so the frontend
 * can honestly describe to the user what the agent is and isn't allowed to
 * do, rather than that being a hidden implementation detail.
 */

export const MAX_TOOL_CALLS_PER_INVESTIGATION = 1

export const TOOL_REGISTRY = {
  financial_summary: {
    name: 'financial_summary',
    label: 'Financial Summary',
    description:
      "Reads the user's own saved business assumptions (price, cost per unit, operating costs) and computes break-even units/revenue and gross margin percent. Read-only, no input parameters, no write access, no consequential action, so no approval gate is required before it runs.",
    inputSchema: {}, // no parameters, operates only on the caller's own business_assumptions row
    readOnly: true,
  },
  startup_capital_summary: {
    name: 'startup_capital_summary',
    label: 'Startup Capital Summary',
    description:
      "Reads the user's own saved startup capital plan (one-off setup costs + available capital) and computes the total estimated capital needed and any funding gap. Read-only, no approval gate required.",
    inputSchema: {},
    readOnly: true,
  },
  simulate_price_change: {
    name: 'simulate_price_change',
    label: 'Simulate Price Change',
    description:
      "Recalculates gross margin and break-even using a hypothetical selling price instead of the saved one, with every other saved assumption unchanged. Read-only, the saved price is never modified, so no approval gate is required.",
    inputSchema: { new_selling_price: 'number' },
    readOnly: true,
  },
}

/** @param {string} toolName @returns {{valid: boolean, errors: string[]}} */
export function validateToolCall(toolName, input = {}) {
  const tool = TOOL_REGISTRY[toolName]
  if (!tool) return { valid: false, errors: [`Unknown tool: "${toolName}". Only tools in TOOL_REGISTRY may be called.`] }

  const errors = []
  const allowedKeys = Object.keys(tool.inputSchema)
  for (const key of Object.keys(input ?? {})) {
    if (!allowedKeys.includes(key)) errors.push(`Unexpected input field "${key}" for tool "${toolName}".`)
  }
  for (const [key, type] of Object.entries(tool.inputSchema)) {
    const value = (input ?? {})[key]
    if (value === undefined) {
      errors.push(`Missing required input field "${key}" for tool "${toolName}".`)
    } else if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) {
      errors.push(`Input field "${key}" for tool "${toolName}" must be a finite number.`)
    }
  }
  return { valid: errors.length === 0, errors }
}

/** @param {number} toolCallsSoFar @returns {boolean} */
export function withinIterationLimit(toolCallsSoFar) {
  return toolCallsSoFar < MAX_TOOL_CALLS_PER_INVESTIGATION
}
