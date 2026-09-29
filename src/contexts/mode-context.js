import { createContext } from 'react'

/**
 * Holds { mode, modeConfig, setMode }.
 * Consume via the useMode() hook in src/hooks/useMode.js.
 */
export const ModeContext = createContext(null)
