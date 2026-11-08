/**
 * FYP II Phase 1 — richer per-mode configuration ("modes.config.js" in the
 * master prompt). Extends the existing src/constants/modes.js MODES ids
 * (`startup`/`ecommerce`) rather than duplicating a second mode system —
 * both modes still share the same pages, models, and pipeline; this file
 * only holds what genuinely differs: target business examples, default
 * language, the data-entry adapter each mode points to, and which outputs
 * are prioritized.
 *
 * `startup` = "Local Malaysian Shop" (Business Startup) in the master
 * prompt's wording; `ecommerce` = "E-commerce Startup". The ids are kept
 * as-is (not renamed) so every existing `mode === 'startup'`/`'ecommerce'`
 * check across the codebase keeps working unchanged.
 */

export const MODE_DETAILS = {
  startup: {
    targetBusinessExamples: [
      'Kedai runcit',
      'Kopitiam / café',
      'Bakery',
      'Florist',
      'Mamak restaurant',
      'Small boutique',
      'Home-based F&B',
    ],
    dataReality:
      'Short and irregular sales history (roughly 3-12 months), daily cash/QR/e-wallet transactions, Google reviews, Facebook/TikTok comments, and WhatsApp-style feedback pasted in directly.',
    defaultLanguage: 'ms',
    availableLanguages: ['ms', 'en', 'zh'],
    salesTemplate: 'local_shop', // see src/utils/csvTemplates.js's buildLocalShopSalesCsvContent()
    pasteReviewsEnabled: true,
    // Shown/prioritized first for this mode — other outputs still exist,
    // just not pushed to the front. Page ids match src/routes/paths.js.
    prioritizedOutputs: [
      { id: 'weekly_sales_vs_forecast', label: 'Weekly sales vs. forecast' },
      { id: 'top_complaint_themes', label: 'Top complaints by theme (harga, servis, kebersihan, masa menunggu)' },
      { id: 'festive_preparation', label: 'Festive-period preparation' },
      { id: 'simple_stock_advice', label: 'Simple stock advice' },
    ],
  },
  ecommerce: {
    targetBusinessExamples: ['Online fashion/beauty seller', 'Marketplace-first FMCG brand', 'D2C skincare/F&B brand'],
    dataReality:
      'Order-level transactions, a product catalogue, marketplace reviews with star ratings, delivery dates, and social comments across multiple platforms.',
    defaultLanguage: 'en',
    availableLanguages: ['en', 'ms', 'zh'],
    salesTemplate: 'sales', // the full src/utils/csvTemplates.js CSV_TEMPLATES 'sales' entry
    pasteReviewsEnabled: false,
    prioritizedOutputs: [
      { id: 'sentiment_by_product_channel_language', label: 'Full sentiment breakdown per product/channel/language' },
      { id: 'forecast_with_sentiment', label: 'Forecast with sentiment regressors' },
      { id: 'crisis_lead_time', label: 'Crisis detection with lead time' },
      { id: 'delivery_complaints', label: 'Delivery-related complaint tracking' },
      { id: 'campaign_period_analysis', label: 'Campaign-period (11.11, 12.12, payday) analysis' },
      { id: 'full_recommendations', label: 'Full recommendation list' },
    ],
  },
}

/** Complaint-theme keyword groups for Local Shop mode's "top complaints by
 * theme" output (Bahasa Melayu-first, since that's this mode's default
 * language) — a transparent keyword lexicon, same honesty convention as
 * src/utils/aspects.js, not a trained classifier. Phase 3+ wires this into
 * an actual theme-tagging util; this config only names the themes. */
export const LOCAL_SHOP_COMPLAINT_THEMES = {
  harga: { label: 'Price (Harga)', keywords: ['harga', 'mahal', 'price', 'expensive'] },
  servis: { label: 'Service (Servis)', keywords: ['servis', 'service', 'pelayan', 'staff', 'layanan'] },
  kebersihan: { label: 'Cleanliness (Kebersihan)', keywords: ['bersih', 'kotor', 'clean', 'dirty', 'kebersihan'] },
  masa_menunggu: { label: 'Waiting time (Masa Menunggu)', keywords: ['lambat', 'lama', 'tunggu', 'wait', 'slow'] },
}

export function getModeDetails(modeId) {
  return MODE_DETAILS[modeId] ?? MODE_DETAILS.ecommerce
}
