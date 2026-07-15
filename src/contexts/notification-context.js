import { createContext } from 'react'

/** Separated from the provider so Fast Refresh stays clean (matches theme-context.js). */
export const NotificationContext = createContext(null)
