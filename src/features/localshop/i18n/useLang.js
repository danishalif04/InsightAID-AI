import { useContext } from 'react'
import { LanguageContext } from './language-context'

export function useLang() {
  return useContext(LanguageContext)
}
