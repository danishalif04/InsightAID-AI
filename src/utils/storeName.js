/**
 * Which store name the Dashboard header shows.
 *
 * - Malaysian Local Shop mode (`startup`): the Local Shop's own shop name
 *   (e.g. the example "Kedai Makmur" or an AI-generated shop) when one is
 *   loaded, otherwise the business profile's name.
 * - Business Startup mode (`ecommerce`): the business profile's name.
 *
 * Returns null when there is nothing real to show, so the header never
 * displays a placeholder name.
 */
export function resolveStoreName({ mode, profileName, localShopName }) {
  const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const profile = clean(profileName)
  if (mode === 'startup') return clean(localShopName) ?? profile
  return profile
}
