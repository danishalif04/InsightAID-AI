import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_MODE, MODES } from '@/constants/modes'
import { getPreferences, savePreferences } from '@/services/settingsService'
import { ModeContext } from './mode-context'

const STORAGE_KEY = 'insightaid.mode'

function getInitialMode() {
  if (typeof window === 'undefined') return DEFAULT_MODE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && MODES[stored] ? stored : DEFAULT_MODE
}

export default function ModeProvider({ children }) {
  const [mode, setModeState] = useState(getInitialMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  // FYP II Phase 1: the mode is now a real per-user Supabase preference
  // (user_preferences.workspace_mode, migration 0010), not just
  // localStorage — on mount, the account's saved mode wins over whatever
  // this browser last used, so switching devices shows the real choice.
  // Best-effort only: if the migration hasn't been run yet, there's no
  // session, or the request fails, the localStorage-derived default from
  // getInitialMode() above is already a valid starting point and this
  // must never block rendering or throw.
  useEffect(() => {
    let cancelled = false
    getPreferences()
      .then((prefs) => {
        if (cancelled) return
        const remoteMode = prefs?.workspace_mode
        if (remoteMode && MODES[remoteMode]) setModeState(remoteMode)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      mode,
      modeConfig: MODES[mode],
      setMode: (next) => {
        const resolved = MODES[next] ? next : DEFAULT_MODE
        setModeState(resolved)
        // Fire-and-forget: the local switch above already applied, so a
        // failed remote save (migration not run, offline) never blocks
        // the UI from reflecting the chosen mode immediately.
        savePreferences({ workspace_mode: resolved }).catch(() => {})
      },
    }),
    [mode]
  )

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
