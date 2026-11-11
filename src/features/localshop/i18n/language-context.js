import { createContext } from 'react'

/** Holds { lang, setLang, t }. */
export const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (key) => key })
