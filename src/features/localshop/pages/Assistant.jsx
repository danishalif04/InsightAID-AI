import { useState } from 'react'
import { Check, Send, Store, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/Input'
import Section from '../components/Section'
import ProvenanceBadge from '../components/ProvenanceBadge'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { useActions } from '../store/useActions'
import { AI_MODE, runInvestigation, STEPS } from '../ai/orchestrator'
import { SUGGESTED_QUESTIONS } from '../ai/mockPlans'

export default function Assistant() {
  const { t, lang } = useLang()
  const { shop, hasShop, loadDemo } = useShop()
  const { addAction } = useActions()

  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [liveTrace, setLiveTrace] = useState([])
  const [investigation, setInvestigation] = useState(null)
  const [history, setHistory] = useState([])
  const [decision, setDecision] = useState(null)

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const ask = async (text) => {
    const trimmed = (text ?? question).trim()
    if (!trimmed || running) return
    setRunning(true)
    setInvestigation(null)
    setDecision(null)
    setLiveTrace([])

    const result = await runInvestigation({
      question: trimmed,
      shop,
      onStep: (step) => setLiveTrace((current) => [...current, step]),
    })

    setInvestigation(result)
    setHistory((current) => [{ q: trimmed, at: new Date().toISOString() }, ...current].slice(0, 8))
    setRunning(false)
    setQuestion('')
  }

  const accept = () => {
    addAction({
      title: investigation.question,
      body: investigation.answer,
      source: `AI investigation · ${investigation.results.map((r) => r.name).join(', ') || 'no tools'}`,
      status: 'accepted',
    })
    setDecision('accepted')
  }

  const reject = () => setDecision('rejected')

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Section
          title={t('nav.assistant')}
          description="Ask a business question. The app calculates; the assistant explains the verified result."
          actions={
            <span className="rounded-full border border-glow-border px-2 py-0.5 text-[10px] text-glow-text/50">
              {AI_MODE === 'live' ? 'Live AI' : 'Offline mode'}
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                disabled={running}
                onClick={() => ask(lang === 'ms' ? suggestion.ms : suggestion.en)}
                className="rounded-full border border-glow-border px-3 py-1.5 text-[11px] text-glow-text/70 transition-colors hover:border-glow-brand/40 hover:text-glow-text disabled:opacity-50"
              >
                {lang === 'ms' ? suggestion.ms : suggestion.en}
              </button>
            ))}
          </div>

          <Textarea
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={lang === 'ms' ? 'Tanya apa-apa tentang perniagaan anda…' : 'Ask anything about your business…'}
          />
          <div className="mt-3 flex justify-end">
            <Button icon={Send} variant="glowBrand" loading={running} disabled={!question.trim()} onClick={() => ask()}>
              {lang === 'ms' ? 'Tanya' : 'Ask'}
            </Button>
          </div>
        </Section>

        {investigation && (
          <Section
            title={lang === 'ms' ? 'Jawapan' : 'Answer'}
            provenance={investigation.answerSource === 'ai' ? 'AI-explained' : 'Calculated'}
          >
            <p className="text-sm leading-relaxed text-glow-text/90">{investigation.answer}</p>

            {/* Evidence: which tools ran, with their real inputs. */}
            {investigation.results.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {investigation.results.map((entry) => (
                  <span
                    key={entry.name}
                    className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-glow-text/60"
                    title={JSON.stringify(entry.args)}
                  >
                    {entry.name}
                  </span>
                ))}
              </div>
            )}

            {investigation.assumptions.length > 0 && (
              <ul className="mt-3 space-y-0.5">
                {investigation.assumptions.map((assumption) => (
                  <li key={assumption} className="text-[11px] text-amber-400/80">
                    Assumption: {assumption}
                  </li>
                ))}
              </ul>
            )}

            {investigation.missing.length > 0 && (
              <p className="mt-2 text-[11px] text-glow-text/40">
                Limitation: {investigation.missing.length} calculation(s) lacked inputs and were left out rather than
                estimated.
              </p>
            )}

            {investigation.answerSource === 'template_after_guard' && (
              <p className="mt-2 text-[11px] text-rose-400">
                The AI wording contained a figure the calculations did not produce, so it was replaced with the
                calculated summary.
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              {decision ? (
                <span className="text-xs text-glow-text/60">
                  {decision === 'accepted'
                    ? lang === 'ms'
                      ? 'Diterima — ditambah ke Pusat Tindakan.'
                      : 'Accepted — added to the Action Centre.'
                    : lang === 'ms'
                      ? 'Ditolak.'
                      : 'Rejected.'}
                </span>
              ) : (
                <>
                  <Button size="sm" variant="glowBrand" icon={Check} onClick={accept}>
                    {lang === 'ms' ? 'Terima' : 'Accept'}
                  </Button>
                  <Button size="sm" variant="glowSecondary" icon={X} onClick={reject}>
                    {lang === 'ms' ? 'Tolak' : 'Reject'}
                  </Button>
                </>
              )}
            </div>
          </Section>
        )}
      </div>

      {/* Investigation Trace — one orchestrator, real steps, real timings. */}
      <aside className="space-y-5">
        <Section title={lang === 'ms' ? 'Jejak Siasatan' : 'Investigation Trace'}>
          <ol className="space-y-2">
            {STEPS.map((step) => {
              const entry = (investigation?.trace ?? liveTrace).find((item) => item.name === step)
              const active = running && !entry
              return (
                <li key={step} className="flex items-start gap-2 text-[11px]">
                  <span
                    className={`mt-1 size-1.5 shrink-0 rounded-full ${
                      entry ? (entry.status === 'skipped' ? 'bg-amber-400' : 'bg-emerald-400') : active ? 'animate-pulse bg-sky-400' : 'bg-glow-text/20'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={entry ? 'font-medium text-glow-text/80' : 'text-glow-text/40'}>{step}</span>
                      {entry && <span className="tabular-nums text-glow-text/30">{entry.at}ms</span>}
                    </div>
                    {entry?.detail && <p className="text-glow-text/50">{entry.detail}</p>}
                  </div>
                </li>
              )
            })}
          </ol>

          {investigation && (
            <p className="mt-3 border-t border-glow-border pt-2 text-[11px] text-glow-text/40">
              {investigation.results.length} tool call(s) · {investigation.totalMs}ms · plan: {investigation.planSource}
            </p>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-glow-text/30">
            One orchestrator calling approved tools — not multiple AI agents. Every figure is computed by the app.
          </p>
        </Section>

        {history.length > 0 && (
          <Section title={lang === 'ms' ? 'Siasatan terkini' : 'Recent investigations'}>
            <ul className="space-y-1.5">
              {history.map((item) => (
                <li key={item.at}>
                  <button
                    type="button"
                    onClick={() => ask(item.q)}
                    className="w-full truncate text-left text-[11px] text-glow-text/60 hover:text-glow-text"
                  >
                    {item.q}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="flex items-center gap-2 text-[10px] text-glow-text/40">
          <ProvenanceBadge kind="Calculated" />
          <span>app</span>
          <ProvenanceBadge kind="AI-explained" />
          <span>wording only</span>
        </div>
      </aside>
    </div>
  )
}
