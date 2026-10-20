import { SOURCE_STATUS } from './sourceStatus'
import { salesDataAdapter } from './salesDataAdapter'
import { shopeeAdapter } from './shopeeAdapter'
import { tiktokAdapter } from './tiktokAdapter'
import { xAdapter } from './xAdapter'
import { threadsAdapter } from './threadsAdapter'
import { shopeeAffiliateAdapter } from './shopeeAffiliateAdapter'
import { lazadaAffiliateAdapter } from './lazadaAffiliateAdapter'
import { tiktokShopAdapter } from './tiktokShopAdapter'

/** Every registered source, in the order shown in Dataset Management. */
export const SOURCE_ADAPTERS = [
  salesDataAdapter,
  shopeeAdapter,
  tiktokAdapter,
  xAdapter,
  threadsAdapter,
  shopeeAffiliateAdapter,
  lazadaAffiliateAdapter,
  tiktokShopAdapter,
]

/**
 * Checks every adapter's status independently (FYP2.md §66 — one source
 * failing must never affect the others). A thrown error becomes that one
 * adapter's own ERROR status, not an app-wide failure.
 */
export async function getAllSourceStatuses() {
  const results = await Promise.all(
    SOURCE_ADAPTERS.map(async (adapter) => {
      try {
        const status = await adapter.checkStatus()
        return { ...adapter, ...status }
      } catch (error) {
        return {
          ...adapter,
          status: SOURCE_STATUS.ERROR,
          lastSync: null,
          recordCount: 0,
          detail: error?.message ?? 'Status check failed.',
        }
      }
    })
  )
  return results
}
