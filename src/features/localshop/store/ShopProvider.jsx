import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEMO_SHOP } from '../data/demoShop'
import { ShopContext } from './shop-context'

const STORAGE_KEY = 'insightaid.localshop.shop'

function readStoredShop() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Local Shop working state. Backed by localStorage for now so the demo
 * survives a refresh without requiring the owner to have run migration
 * 0016 — Supabase persistence is wired in a later phase. The
 * `illustrative` flag travels with the shop so every screen can ribbon
 * demo figures rather than passing them off as the owner's own.
 */
export default function ShopProvider({ children }) {
  const [shop, setShopState] = useState(readStoredShop)

  useEffect(() => {
    try {
      if (shop) localStorage.setItem(STORAGE_KEY, JSON.stringify(shop))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage being unavailable must not break the session's state.
    }
  }, [shop])

  const setShop = useCallback((next) => {
    setShopState((current) => (typeof next === 'function' ? next(current) : next))
  }, [])

  const loadDemo = useCallback(() => setShopState(structuredClone(DEMO_SHOP)), [])
  const clearShop = useCallback(() => setShopState(null), [])

  const value = useMemo(
    () => ({ shop, setShop, loadDemo, clearShop, hasShop: !!shop, isDemo: shop?.illustrative === true }),
    [shop, setShop, loadDemo, clearShop]
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
