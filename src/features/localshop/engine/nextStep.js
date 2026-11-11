/**
 * The "InsightAid AI suggests" line on the Overview.
 *
 * Rule-based from the readiness result, NOT an LLM call: it runs on every
 * page load, so a live call would burn tokens for a sentence that is
 * fully determined by which capabilities are unlocked. The assistant is
 * one click away for anything that genuinely needs reasoning.
 */

const NEXT_STEP = {
  product_margin: 'Add a cost and selling price to each product so margins can be calculated.',
  break_even: 'Record your monthly fixed costs to see how much you need to sell to cover them.',
  financial_planning: 'Record your monthly expenses to see where your money goes.',
  scenario_modelling: 'Add product prices and fixed costs to test pricing scenarios.',
  startup_capital: 'List your one-off setup costs to estimate the capital you need.',
  sales_trend: 'You have registered your products and estimated expenses. The next useful step is to identify your best-selling products by recording daily sales.',
  forecasting: 'Keep recording daily sales — about three months unlocks forecasting.',
  sentiment: 'Start collecting customer feedback to unlock sentiment analysis.',
}

/** @param {{capabilities: Array<{id:string,status:string}>}} readinessResult */
export function nextStepFor(readinessResult) {
  const capabilities = readinessResult?.capabilities ?? []
  const next = capabilities.find((c) => c.status === 'locked') ?? capabilities.find((c) => c.status === 'partial')
  if (!next) return 'Your planning information is complete. Explore the What-If Simulator to test pricing decisions.'
  return NEXT_STEP[next.id] ?? 'Keep adding business information to unlock more analysis.'
}
