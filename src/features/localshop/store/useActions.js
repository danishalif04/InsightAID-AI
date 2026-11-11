import { useContext } from 'react'
import { ActionsContext } from './actions-context'

export function useActions() {
  const value = useContext(ActionsContext)
  if (!value) throw new Error('useActions must be used inside an ActionsProvider')
  return value
}
