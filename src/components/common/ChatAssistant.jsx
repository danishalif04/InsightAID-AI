import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle, Loader2, Send, X } from 'lucide-react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useLowSensoryMode } from '@/hooks/useLowSensoryMode'
import { sendChatMessage } from '@/services/chatAssistantService'

const GREETING = {
  role: 'assistant',
  content:
    "Hi! I can help explain how InsightAid AI works, what a feature or metric means, which page to use, and so on. I can't see your account's real data (sentiment scores, sales, crisis status), so for questions about your own numbers, I'll point you to the right page instead of guessing.",
}

/**
 * Floating "Ask InsightAid AI" help button — bottom-right, every
 * authenticated page (mounted once in AppShell.jsx). General-app-help
 * scope only, decided explicitly with the user: this never claims to see
 * the signed-in account's real business data — see
 * supabase/functions/chat-assistant for the enforcement (system prompt +
 * zero database access from that function).
 *
 * Conversation lives in local state only — no persistence, resets on
 * reload. That's an accepted trade-off for this scope, not an oversight.
 */
export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(null)

  const osReducedMotion = useReducedMotion()
  const lowSensory = useLowSensoryMode()
  const motionAllowed = !osReducedMotion && !lowSensory

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, sending, open])

  const handleSend = async (event) => {
    event.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setSending(true)

    try {
      // Only user/assistant turns go to the function — the greeting above
      // is local UI copy, not something the AI itself said, so it's
      // excluded from what's sent as conversation history.
      const history = nextMessages.filter((m) => m !== GREETING)
      const reply = await sendChatMessage(history)
      setMessages((current) => [...current, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-glow-brand text-glow-bg shadow-[0_8px_30px_-8px_rgba(34,197,94,0.6)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-brand focus-visible:ring-offset-2"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <HelpCircle className="size-6" aria-hidden="true" />}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-modal="false"
              aria-label="Ask InsightAid AI"
              initial={motionAllowed ? { opacity: 0, y: 16, scale: 0.97 } : false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={motionAllowed ? { opacity: 0, y: 16, scale: 0.97 } : undefined}
              transition={{ duration: motionAllowed ? 0.18 : 0 }}
              className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-glow-border bg-glow-surface-elevated shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-glow-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-glow-text">Ask InsightAid AI</p>
                  <p className="text-xs text-glow-text/50">General app help, not your live data</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-glow-text/50 hover:bg-white/5 hover:text-glow-text"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-glow-brand/15 text-glow-text'
                          : 'bg-white/5 text-glow-text/90'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-glow-text/60">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      Thinking…
                    </div>
                  </div>
                )}
                {error && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-glow-border p-3">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="Ask how a feature works…"
                  aria-label="Your question"
                  disabled={sending}
                  className="min-w-0 flex-1 rounded-full border border-glow-border bg-white/5 px-3.5 py-2 text-sm text-glow-text placeholder:text-glow-text/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-glow-brand"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-glow-brand text-glow-bg transition-opacity disabled:opacity-40"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
