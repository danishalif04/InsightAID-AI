/**
 * Offline plans for the suggested investigations.
 *
 * Used when VITE_AI_MODE=mock, and automatically as the fallback when the
 * live provider is unreachable or rate-limited — so a demo never dies on
 * a network failure. The numbers still come from the engine; only the
 * tool choice and the wording are canned, and the UI labels the answer as
 * a template rather than an AI explanation.
 */

export const SUGGESTED_QUESTIONS = [
  { id: 'daily', en: 'How much should I sell daily to cover my expenses?', ms: 'Berapa jualan harian untuk tampung perbelanjaan?' },
  { id: 'margin', en: 'Which product gives me the highest profit margin?', ms: 'Produk mana beri margin keuntungan tertinggi?' },
  { id: 'capital', en: 'I have RM15,000 capital. Is it enough to open a small grocery shop?', ms: 'Saya ada modal RM15,000. Cukup ke untuk buka kedai runcit kecil?' },
  { id: 'electricity', en: 'What happens if my costs increase?', ms: 'Apa jadi kalau kos saya naik?' },
  { id: 'expenses', en: 'Where is my money going each month?', ms: 'Ke mana perginya duit saya setiap bulan?' },
]

const MATCHERS = [
  { id: 'capital', pattern: /modal|capital|cukup|enough|afford|startup|buka kedai/i, tools: [{ name: 'calculate_startup_capital', args: {} }] },
  { id: 'daily', pattern: /daily|harian|per day|sehari|cover|tampung|break.?even|pulang modal/i, tools: [{ name: 'calculate_break_even', args: {} }] },
  { id: 'margin', pattern: /margin|profit|untung|highest|tertinggi|product/i, tools: [{ name: 'calculate_product_margin', args: {} }] },
  { id: 'electricity', pattern: /increase|naik|cost|kos|electricity|elektrik|supplier|harga/i, tools: [{ name: 'analyse_cost_exposure', args: { increase_pct: 10 } }] },
  { id: 'expenses', pattern: /expense|perbelanjaan|duit|money|spend|belanja/i, tools: [{ name: 'calculate_monthly_expenses', args: {} }] },
  { id: 'plan', pattern: /plan|rancangan|summary|ringkasan/i, tools: [{ name: 'generate_business_plan', args: {} }] },
]

/** Deterministic tool plan for a question. Also the fallback when live planning fails. */
export function mockPlan(question) {
  const matched = MATCHERS.find((matcher) => matcher.pattern.test(question ?? ''))
  return {
    id: matched?.id ?? 'readiness',
    tools: matched?.tools ?? [{ name: 'check_readiness', args: {} }],
  }
}

/**
 * Template explanation built from real tool output. Deliberately plain:
 * it states the figures and stops, with no interpretation the engine
 * cannot support.
 */
export function templateAnswer(planId, results, lang = 'en') {
  const result = results[0]?.result ?? {}
  const rm = (value) => `RM${Number(value).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`

  const EN = {
    capital: () =>
      result.gap === null || result.gap === undefined
        ? `Your recorded setup costs total ${rm(result.total)}. Add your available capital to see the gap.`
        : `Your setup costs total ${rm(result.total)}, and with a ${result.monthsBuffer}-month operating buffer you would need about ${rm(result.cashNeeded)}. Against ${rm(result.availableCapital)} available, that is ${result.shortfall ? `a shortfall of ${rm(result.gap)}` : `a surplus of ${rm(Math.abs(result.gap))}`}. Missing categories: ${result.missing?.length ? result.missing.join(', ') : 'none'}.`,
    daily: () =>
      `To cover ${rm(result.fixed)} of monthly fixed costs you need about ${rm(result.revenue)} in monthly sales, roughly ${result.units} units a month or ${result.dailyUnits} a day at your current prices.`,
    margin: () =>
      `Your highest margin is ${result.top?.[0]?.n} at ${result.top?.[0]?.m}%. ${result.note ?? ''}`,
    electricity: () =>
      `At a price of ${rm(result.price)}, a unit cost moving from ${rm(result.oldCost)} to ${rm(result.newCost)} changes the gross margin from ${result.marginBeforePct}% to ${result.marginAfterPct}%. Holding the old margin would need a price of ${rm(result.priceToHoldMargin)}.`,
    expenses: () =>
      `You record ${rm(result.total)} of monthly expenses: ${rm(result.fixed)} fixed and ${rm(result.variable)} variable. The largest is ${result.top?.[0]?.c} at ${rm(result.top?.[0]?.a)}.`,
    plan: () =>
      `${result.business?.name ?? 'Your shop'} has ${result.products} products, ${rm(result.monthlyExpenses)} of monthly expenses and a break-even of ${rm(result.breakEvenRevenue)}. Readiness is ${result.readinessPct}%. Still needed: ${result.stillNeeded?.join(', ') || 'nothing'}.`,
    readiness: () =>
      `Your business readiness is ${result.percent}%. Unlocked: ${result.ready?.join(', ') || 'none yet'}. Still locked: ${result.locked?.map((l) => l.id).join(', ') || 'none'}.`,
  }

  const MS = {
    capital: () =>
      result.gap === null || result.gap === undefined
        ? `Jumlah kos permulaan yang direkodkan ialah ${rm(result.total)}. Masukkan modal sedia ada untuk melihat jurangnya.`
        : `Kos permulaan anda berjumlah ${rm(result.total)}, dan dengan penampan operasi ${result.monthsBuffer} bulan anda perlukan kira-kira ${rm(result.cashNeeded)}. Berbanding ${rm(result.availableCapital)} yang ada, itu ${result.shortfall ? `kekurangan ${rm(result.gap)}` : `lebihan ${rm(Math.abs(result.gap))}`}. Kategori belum diisi: ${result.missing?.length ? result.missing.join(', ') : 'tiada'}.`,
    daily: () =>
      `Untuk menampung kos tetap bulanan ${rm(result.fixed)}, anda perlukan kira-kira ${rm(result.revenue)} jualan sebulan, lebih kurang ${result.units} unit sebulan atau ${result.dailyUnits} unit sehari pada harga semasa.`,
    margin: () => `Margin tertinggi anda ialah ${result.top?.[0]?.n} pada ${result.top?.[0]?.m}%.`,
    electricity: () =>
      `Pada harga ${rm(result.price)}, kos unit dari ${rm(result.oldCost)} ke ${rm(result.newCost)} mengubah margin kasar dari ${result.marginBeforePct}% ke ${result.marginAfterPct}%. Untuk kekalkan margin asal, harga perlu ${rm(result.priceToHoldMargin)}.`,
    expenses: () =>
      `Anda merekodkan ${rm(result.total)} perbelanjaan bulanan: ${rm(result.fixed)} tetap dan ${rm(result.variable)} berubah. Yang terbesar ialah ${result.top?.[0]?.c} pada ${rm(result.top?.[0]?.a)}.`,
    plan: () =>
      `${result.business?.name ?? 'Kedai anda'} mempunyai ${result.products} produk, perbelanjaan bulanan ${rm(result.monthlyExpenses)} dan pulang modal ${rm(result.breakEvenRevenue)}. Kesediaan ${result.readinessPct}%.`,
    readiness: () => `Kesediaan perniagaan anda ialah ${result.percent}%.`,
  }

  const table = lang === 'ms' ? MS : EN
  const builder = table[planId] ?? table.readiness
  try {
    return builder()
  } catch {
    return lang === 'ms' ? 'Maklumat belum mencukupi untuk menjawab soalan itu.' : 'There is not enough information to answer that yet.'
  }
}
