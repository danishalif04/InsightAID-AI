/**
 * Downloadable CSV templates (FYP2.md §34). Download only — upload/validate/
 * preview/import is §35 territory (Dataset Management's upload flow), out
 * of scope here.
 */

export const CSV_TEMPLATES = [
  {
    id: 'sales',
    label: 'Sales',
    filename: 'insightaid_sales_template.csv',
    columns: ['date', 'product', 'category', 'quantity_sold', 'unit_price', 'revenue', 'discount', 'cost'],
  },
  {
    id: 'reviews',
    label: 'Customer Reviews',
    filename: 'insightaid_customer_reviews_template.csv',
    columns: ['date', 'product', 'review_text', 'rating', 'platform'],
  },
  {
    id: 'social',
    label: 'Social Media',
    filename: 'insightaid_social_media_template.csv',
    columns: ['date', 'platform', 'content', 'engagement', 'likes', 'comments', 'shares'],
  },
  {
    id: 'product',
    label: 'Product',
    filename: 'insightaid_product_template.csv',
    columns: ['product', 'category', 'price', 'cost', 'stock'],
  },
  {
    id: 'expenses',
    label: 'Expenses',
    filename: 'insightaid_expenses_template.csv',
    columns: ['date', 'expense_category', 'amount', 'description'],
  },
]

/**
 * Common alternate header names real-world exports use for each canonical
 * column (FYP2.md §35 — never silently modify DATA, but header names are
 * not data; recognizing "Order Date" as the same concept as "date" is
 * mapping, not altering what was uploaded. The original header/row is
 * still stored byte-for-byte in raw_data.payload regardless — see
 * dataPipelineService.ingestRows).
 */
export const COLUMN_SYNONYMS = {
  sales: {
    date: ['order date', 'transaction date', 'sale date', 'txn date'],
    product: ['product name', 'item', 'item name', 'sku name'],
    category: ['product category'],
    quantity_sold: ['quantity', 'qty', 'units sold', 'qty sold'],
    unit_price: ['price', 'selling price', 'item price', 'unit cost price'],
    revenue: ['total', 'total price', 'total revenue', 'total amount', 'sales amount', 'amount', 'amount rm', 'amount (rm)'],
    discount: ['discount amount', 'voucher amount', 'voucher'],
    cost: ['cost price', 'unit cost'],
    // Recognized but intentionally NOT in CSV_TEMPLATES' sales.columns above
    // (never required) — a local Malaysian shop's daily cash/QR/e-wallet
    // sales commonly record how a sale was paid; a bigger e-commerce
    // seller's export usually won't have this column at all, and that must
    // stay a non-issue, never a "missing required column" warning.
    payment_method: ['payment', 'payment type', 'payment mode', 'payment method', 'e-wallet', 'ewallet', 'tunai'],
  },
  reviews: {
    date: ['review date', 'date posted'],
    product: ['product name', 'item', 'item name'],
    review_text: ['review', 'comment', 'feedback', 'review content', 'text', 'content'],
    rating: ['star', 'stars', 'score', 'rating stars'],
    platform: ['source', 'channel'],
  },
  social: {
    date: ['post date', 'published date', 'created at', 'created_at'],
    platform: ['source', 'channel', 'network'],
    content: ['text', 'post', 'post content', 'caption', 'message'],
    engagement: ['total engagement', 'interactions'],
    likes: ['like count', 'favorites', 'favourites'],
    comments: ['comment count', 'replies'],
    shares: ['share count', 'retweets', 'reposts'],
  },
  product: {
    product: ['product name', 'item', 'name'],
    category: ['product category'],
    price: ['selling price', 'unit price', 'list price'],
    cost: ['cost price', 'unit cost'],
    stock: ['quantity', 'inventory', 'qty on hand', 'stock qty'],
  },
  expenses: {
    date: ['expense date', 'transaction date'],
    expense_category: ['category', 'type', 'expense type'],
    amount: ['cost', 'total', 'expense amount'],
    description: ['notes', 'memo', 'details'],
  },
}

/** "Order Date" / "order_date" / "  Order-Date " all normalize the same,
 * so header matching doesn't care about case, punctuation, or spacing. */
export function normalizeHeader(header) {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function buildCanonicalLookup(templateId) {
  const template = CSV_TEMPLATES.find((item) => item.id === templateId)
  if (!template) return new Map()

  const lookup = new Map()
  for (const column of template.columns) {
    lookup.set(normalizeHeader(column), column)
  }
  for (const [column, synonyms] of Object.entries(COLUMN_SYNONYMS[templateId] ?? {})) {
    for (const synonym of synonyms) lookup.set(normalizeHeader(synonym), column)
  }
  return lookup
}

/**
 * Matches a file's real headers against one template's columns (exact name
 * or a known synonym, case/spacing-insensitive). Returns how many of the
 * template's canonical columns were found, and the original-header ->
 * canonical-column mapping for whichever ones matched.
 * @returns {{matchCount: number, mapping: Map<string,string>}}
 */
export function matchColumnsForTemplate(templateId, headers) {
  const lookup = buildCanonicalLookup(templateId)
  const mapping = new Map()

  for (const header of headers) {
    const canonical = lookup.get(normalizeHeader(header))
    if (canonical && !mapping.has(header)) mapping.set(header, canonical)
  }

  // Count distinct canonical columns matched (two headers synonymous with
  // the same column should not double-count).
  const matchCount = new Set(mapping.values()).size
  return { matchCount, mapping }
}

/** Renames each record's keys from whatever header the file used to the
 * matched canonical column name. Unmatched headers/columns are dropped
 * from the returned view (they simply aren't part of this template) — the
 * original record, headers included, is never touched; this is a separate
 * normalized copy for validation/processing. */
export function remapRecordToCanonicalColumns(record, mapping) {
  const remapped = {}
  for (const [header, canonical] of mapping.entries()) {
    if (header in record) remapped[canonical] = record[header]
  }
  return remapped
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Builds the CSV text for a template — header row only (no invented example data). */
export function buildCsvContent(templateId) {
  const template = CSV_TEMPLATES.find((item) => item.id === templateId)
  if (!template) throw new Error(`Unknown CSV template: ${templateId}`)
  return template.columns.map(escapeCsvCell).join(',') + '\n'
}

/**
 * A friendlier-header download variant for the Local Malaysian Shop mode
 * (FYP II Phase 1) — simpler column names than the full `sales` template
 * (`date, item, quantity, amount_RM, payment_method` rather than
 * `date, product, category, quantity_sold, unit_price, revenue, discount,
 * cost`). This is NOT a separate entry in CSV_TEMPLATES/COLUMN_SYNONYMS —
 * doing that would give it its own `template_id` and need a database check-
 * constraint change. Instead its header names are already recognized
 * synonyms of the real `sales` template's canonical columns (see
 * COLUMN_SYNONYMS.sales: `item` → product, `quantity` → quantity_sold,
 * `amount_rm`/`amount (rm)` → revenue, `payment_method` → the new optional
 * field above), so a file downloaded from here uploads and auto-detects as
 * `template_id = 'sales'` exactly like the full template does — one
 * ingestion path, two header conventions for two kinds of seller.
 */
const LOCAL_SHOP_SALES_FILENAME = 'insightaid_local_shop_sales_template.csv'
const LOCAL_SHOP_SALES_COLUMNS = ['date', 'item', 'quantity', 'amount_RM', 'payment_method']

export function buildLocalShopSalesCsvContent() {
  return LOCAL_SHOP_SALES_COLUMNS.map(escapeCsvCell).join(',') + '\n'
}

function triggerCsvDownload(content, filename) {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadLocalShopSalesTemplate() {
  triggerCsvDownload(buildLocalShopSalesCsvContent(), LOCAL_SHOP_SALES_FILENAME)
}

/** Triggers a browser download of the template. No-op outside a browser (e.g. during tests/SSR). */
export function downloadCsvTemplate(templateId) {
  const template = CSV_TEMPLATES.find((item) => item.id === templateId)
  if (!template) throw new Error(`Unknown CSV template: ${templateId}`)
  triggerCsvDownload(buildCsvContent(templateId), template.filename)
}
