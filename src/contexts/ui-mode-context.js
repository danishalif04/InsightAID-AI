import { createContext } from 'react'

/**
 * Holds { uiMode, uiModeConfig, setUiMode }.
 * Consume via the useUIMode() hook in src/hooks/useUIMode.js.
 */
export const UIModeContext = createContext(null)
