import { useContext } from 'react'
import { UIModeContext } from '@/contexts/ui-mode-context'

export function useUIMode() {
  const context = useContext(UIModeContext)
  if (!context) {
    throw new Error('useUIMode must be used within <UIModeProvider>')
  }
  return context
}
