import { useCallback, useMemo, useState } from 'react'
import { LanguageContext } from './language-context'
import { translate } from './strings'

const STORAGE_KEY = 'insightaid.localshop.lang'

function readStoredLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'ms' || stored === 'en' ? stored : 'en'
  } catch {
    return 'en'
  }
}

/**
 * BM/EN switch for the Local Shop pathway. Scoped here rather than global
 * because the rest of the app has no translated strings yet — lifting it
 * app-wide is a separate piece of work, not something to fake by wrapping
 * untranslated pages in a language provider.
 */
export default function LanguageProvider({ children }) {
  const [lang, setLang] = useState(readStoredLang)

  const changeLang = useCallback((next) => {
    setLang(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A blocked localStorage must not break the switch for this session.
    }
  }, [])

  const value = useMemo(
    () => ({ lang, setLang: changeLang, t: (key) => translate(lang, key) }),
    [lang, changeLang]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
