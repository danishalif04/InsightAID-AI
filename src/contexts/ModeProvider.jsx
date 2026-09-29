import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_MODE, MODES } from '@/constants/modes'
import { ModeContext } from './mode-context'

const STORAGE_KEY = 'insightaid.mode'

function getInitialMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && MODES[stored] ? stored : DEFAULT_MODE
}

export default function ModeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      modeConfig: MODES[mode],
      setMode: (next) => setMode(MODES[next] ? next : DEFAULT_MODE),
    }),
    [mode]
  )

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
