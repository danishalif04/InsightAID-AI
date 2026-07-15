import { createContext } from 'react'

/**
 * Holds { theme, isDark, toggleTheme, setTheme }.
 * Consume via the useTheme() hook in src/hooks/useTheme.js.
 */
export const ThemeContext = createContext(null)
