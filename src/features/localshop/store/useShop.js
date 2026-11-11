import { useContext } from 'react'
import { ShopContext } from './shop-context'

export function useShop() {
  const value = useContext(ShopContext)
  if (!value) throw new Error('useShop must be used inside a ShopProvider')
  return value
}
