import { useContext } from 'react'
import { ModeContext } from '@/contexts/mode-context'

export function useMode() {
  const context = useContext(ModeContext)
  if (!context) {
    throw new Error('useMode must be used within <ModeProvider>')
  }
  return context
}
