import { createContext } from 'react'

/**
 * Holds { user, session, loading, signIn, signUp, signOut }.
 * Consume via the useAuth() hook in src/hooks/useAuth.js.
 */
export const AuthContext = createContext(null)
