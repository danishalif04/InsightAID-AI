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

/** Triggers a browser download of the template. No-op outside a browser (e.g. during tests/SSR). */
export function downloadCsvTemplate(templateId) {
  const template = CSV_TEMPLATES.find((item) => item.id === templateId)
  if (!template) throw new Error(`Unknown CSV template: ${templateId}`)
  if (typeof document === 'undefined') return

  const blob = new Blob([buildCsvContent(templateId)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = template.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
