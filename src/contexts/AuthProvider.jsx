import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/config/supabaseClient'
import { AuthContext } from './auth-context'

const NOT_CONFIGURED_ERROR = {
  message: 'Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
}

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signIn: (email, password) =>
        supabase
          ? supabase.auth.signInWithPassword({ email, password })
          : Promise.resolve({ data: {}, error: NOT_CONFIGURED_ERROR }),
      signUp: (email, password, fullName) =>
        supabase
          ? supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
          : Promise.resolve({ data: {}, error: NOT_CONFIGURED_ERROR }),
      signOut: () => (supabase ? supabase.auth.signOut() : Promise.resolve({ error: NOT_CONFIGURED_ERROR })),
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
