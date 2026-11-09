import { useCallback, useMemo, useState } from 'react'

/** Real browser Web Speech API (window.speechSynthesis) — never a fake
 * "speaking..." state with no sound. Returns supported=false (and a
 * no-op speak) in any environment without it, so a caller can hide the
 * button entirely rather than render a broken one — FYP II Phase 7's
 * Senior-mode text-to-speech requirement. */
export function useTextToSpeech(lang = 'ms-MY') {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = useCallback(
    (text) => {
      if (!supported || !text) return
      window.speechSynthesis.cancel()
      const utterance = new window.SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    },
    [lang, supported]
  )

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return useMemo(() => ({ supported, speaking, speak, stop }), [supported, speaking, speak, stop])
}
