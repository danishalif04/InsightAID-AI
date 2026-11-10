import { useState } from 'react'
import { Send } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import PageHero from '@/components/ui/PageHero'
import { useMode } from '@/hooks/useMode'
import { useNotifications } from '@/hooks/useNotifications'
import { routeQuestion } from '@/utils/agentRouting'
import { askAgent, getAgentFacts } from '@/services/agentOrchestratorService'

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

const EXAMPLE_QUESTIONS = [
  'What is my current crisis risk level?',
  'How is my revenue forecast looking?',
  'What should I do to grow my business?',
  'What do customers think of my products right now?',
]

export default function AgentOrchestrator() {
  const { mode } = useMode()
  const { notify } = useNotifications()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleAsk = async () => {
    const trimmed = question.trim()
    if (!trimmed) return
    setLoading(true)
    setResult(null)
    try {
      const agent = routeQuestion(trimmed)
      const facts = await getAgentFacts(mode)
      const answer = await askAgent({ question: trimmed, agentLabel: agent.label, facts })
      setResult({ agent, facts, answer })
    } catch (error) {
      notify(error.message ?? 'Could not get an answer right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Agentic BI — Demo"
        title="Ask the Agent Orchestrator"
        highlight="Orchestrator"
        description="A compact demo of question routing — ask a business question and see which specialist agent handles it."
      />

      <GlowSection>
        <p className="text-xs text-glow-text/50">
          This is a simplified demo of the planned full agent architecture (Manager Agent + specialist
          agents, a controlled tool registry, investigation logging) — see{' '}
          <code className="rounded bg-white/5 px-1 py-0.5">docs/AUDIT_v3_agentic_direction.md</code> for what's
          real today vs. planned. Here, routing is simple keyword matching and the answer is phrased from
          real data already computed elsewhere in this app — nothing is fabricated, but it is not yet the
          multi-step, tool-calling agent described in the full plan.
        </p>
      </GlowSection>

      <GlowSection title="Ask a question" description="Try one of these, or type your own">
        <div className="mb-3 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuestion(example)}
              className="rounded-full border border-glow-border px-3 py-1.5 text-xs text-glow-text/70 transition-colors hover:bg-white/5"
            >
              {example}
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          placeholder="e.g. Is my business at risk right now?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <Button icon={Send} variant="glowBrand" loading={loading} disabled={!question.trim()} onClick={handleAsk}>
            Ask
          </Button>
        </div>
      </GlowSection>

      {result && (
        <GlowSection>
          <div className="flex items-center gap-2">
            <Badge tone="brand">{result.agent.label}</Badge>
            <span className="text-xs text-glow-text/40">handled this question</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-glow-text/90">{result.answer}</p>

          <details className="mt-4 text-xs text-glow-text/50">
            <summary className="cursor-pointer select-none text-glow-text/60">
              Real facts given to the agent ({result.facts.length})
            </summary>
            {result.facts.length === 0 ? (
              <p className="mt-2 italic">No facts were available for this account yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {result.facts.map((fact, index) => (
                  <li key={index}>
                    <span className="text-glow-text/70">{fact.label}:</span> {fact.value}
                  </li>
                ))}
              </ul>
            )}
          </details>
        </GlowSection>
      )}
    </div>
  )
}
