import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_UI_MODE, UI_MODES } from '@/constants/uiModes'
import { getPreferences, savePreferences } from '@/services/settingsService'
import { UIModeContext } from './ui-mode-context'

const STORAGE_KEY = 'insightaid.uiMode'
const ALL_HTML_CLASSES = Object.values(UI_MODES)
  .map((config) => config.htmlClass)
  .filter(Boolean)

function getInitialUiMode() {
  if (typeof window === 'undefined') return DEFAULT_UI_MODE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && UI_MODES[stored] ? stored : DEFAULT_UI_MODE
}

/** FYP II Phase 7 — mirrors ModeProvider.jsx's exact pattern (localStorage
 * default, best-effort sync to the real per-user Supabase preference,
 * migration 0012) for a different, unrelated setting: UI accessibility
 * mode, not the business-workspace mode. Applies/removes the mode's HTML
 * class on <html> so src/styles/index.css's `.ui-low-sensory`/`.ui-senior`
 * rules take effect everywhere, with no page reload. */
export default function UIModeProvider({ children }) {
  const [uiMode, setUiModeState] = useState(getInitialUiMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, uiMode)
    const root = document.documentElement
    root.classList.remove(...ALL_HTML_CLASSES)
    const htmlClass = UI_MODES[uiMode]?.htmlClass
    if (htmlClass) root.classList.add(htmlClass)
  }, [uiMode])

  useEffect(() => {
    let cancelled = false
    getPreferences()
      .then((prefs) => {
        if (cancelled) return
        const remoteMode = prefs?.ui_accessibility_mode
        if (remoteMode && UI_MODES[remoteMode]) setUiModeState(remoteMode)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      uiMode,
      uiModeConfig: UI_MODES[uiMode],
      setUiMode: (next) => {
        const resolved = UI_MODES[next] ? next : DEFAULT_UI_MODE
        setUiModeState(resolved)
        savePreferences({ ui_accessibility_mode: resolved }).catch(() => {})
      },
    }),
    [uiMode]
  )

  return <UIModeContext.Provider value={value}>{children}</UIModeContext.Provider>
}
