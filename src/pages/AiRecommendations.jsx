import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw, SaveAll, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import InfoPopover from '@/components/ui/InfoPopover'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { CATEGORIES, SCCT_STRATEGIES } from '@/utils/recommendationRules'
import { getRecommendations, saveRecommendations, submitRecommendationFeedback } from '@/services/recommendationService'

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' }

function GlowSection({ title, description, guide, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && (
        <h2 className="flex items-center gap-1 text-sm font-semibold text-glow-text">
          {title}
          {guide && <InfoPopover guide={guide} label={`About ${title}`} />}
        </h2>
      )}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function RecommendationCard({ recommendation }) {
  const { notify } = useNotifications()
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState(null) // null | 'useful' | 'not_useful' | 'sending'
  const scct = recommendation.scctStrategy ? SCCT_STRATEGIES[recommendation.scctStrategy] : null

  const handleFeedback = async (useful) => {
    setFeedback('sending')
    try {
      await submitRecommendationFeedback(recommendation.id, useful)
      setFeedback(useful ? 'useful' : 'not_useful')
    } catch (error) {
      setFeedback(null)
      notify(`Could not record feedback: ${error.message}`, 'error')
    }
  }

  return (
    <div className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{recommendation.category}</Badge>
        <Badge tone={PRIORITY_TONE[recommendation.priority]}>{recommendation.priority} priority</Badge>
        {scct && (
          <span title={scct.description}>
            <Badge tone="info">SCCT: {scct.label}</Badge>
          </span>
        )}
        <span
          className="ml-auto text-[11px] text-glow-text/40"
          title="Rule ID — the exact rule in src/utils/recommendationRules.js that produced this"
        >
          {recommendation.id}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-glow-text">{recommendation.title}</p>

      <ul className="mt-3 space-y-1">
        {recommendation.evidence.map((line) => (
          <li key={line} className="text-xs leading-relaxed text-glow-text/60">
            • {line}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-glow-text/50">Was this useful?</span>
        <button
          type="button"
          disabled={feedback === 'sending' || feedback === 'useful' || feedback === 'not_useful'}
          onClick={() => handleFeedback(true)}
          aria-label="Mark this recommendation as useful"
          className={`rounded-full p-1.5 transition-colors ${feedback === 'useful' ? 'bg-glow-brand/15 text-glow-brand' : 'text-glow-text/40 hover:bg-white/5 hover:text-glow-text/70'}`}
        >
          <ThumbsUp className="size-3.5" />
        </button>
        <button
          type="button"
          disabled={feedback === 'sending' || feedback === 'useful' || feedback === 'not_useful'}
          onClick={() => handleFeedback(false)}
          aria-label="Mark this recommendation as not useful"
          className={`rounded-full p-1.5 transition-colors ${feedback === 'not_useful' ? 'bg-rose-500/15 text-rose-400' : 'text-glow-text/40 hover:bg-white/5 hover:text-glow-text/70'}`}
        >
          <ThumbsDown className="size-3.5" />
        </button>
        {(feedback === 'useful' || feedback === 'not_useful') && (
          <span className="text-[11px] text-glow-text/40">Thanks — recorded.</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-4 flex w-full items-center justify-between rounded-full border border-glow-border px-3 py-2 text-xs font-medium text-glow-text/70 transition-colors hover:bg-white/5"
      >
        Why this recommendation?
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-2 rounded-2xl bg-white/[0.03] p-3 text-xs leading-relaxed text-glow-text/70">
          {recommendation.explainedBy === 'ai' ? (
            <>
              <p>{recommendation.rationale}</p>
              {recommendation.context && <p className="mt-2">{recommendation.context}</p>}
              <p className="mt-2 text-[11px] text-glow-text/40">
                Explained by AI, from the evidence above only.
              </p>
            </>
          ) : (
            <p className="text-glow-text/50">
              AI explanation unavailable right now — this recommendation is shown from the rule
              engine's evidence above, which is always real regardless of the AI layer's availability.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function AiRecommendations() {
  const { notify } = useNotifications()
  const { mode } = useMode()
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [businessContext, setBusinessContext] = useState([])
  const [explainerAvailable, setExplainerAvailable] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getRecommendations(mode)
      setRecommendations(result.recommendations)
      setBusinessContext(result.businessContext)
      setExplainerAvailable(result.explainerAvailable)
    } catch (error) {
      notify(`Could not generate recommendations: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveRecommendations(recommendations, `run-${Date.now()}`)
      notify('Recommendations saved.')
    } catch (error) {
      notify(`Could not save recommendations: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const filtered = recommendations.filter((item) => category === 'All' || item.category === category)

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Decision Support"
        title="AI Recommendations"
        highlight="Recommendations"
        description="Rule-based, explainable suggestions — every card shows the exact evidence that triggered it, never a fabricated one."
        actions={
          <>
            <Button icon={RefreshCw} variant="glowSecondary" loading={loading} onClick={load}>
              Regenerate
            </Button>
            <Button
              icon={SaveAll}
              variant="glowBrand"
              loading={saving}
              disabled={recommendations.length === 0}
              onClick={handleSave}
            >
              Save
            </Button>
          </>
        }
      />

      <GlowSection>
        <div className="flex flex-wrap gap-2">
          {['All', ...CATEGORIES].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === option
                  ? 'bg-glow-brand text-glow-bg'
                  : 'border border-glow-border text-glow-text/70 hover:bg-white/5'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {!loading && !explainerAvailable && recommendations.length > 0 && (
          <p className="mt-3 text-xs text-glow-text/50">
            AI explanations are unavailable right now — recommendations below are still real,
            rule-based results.
          </p>
        )}
      </GlowSection>

      <GlowSection
        title="Business Context"
        description="Factors these recommendations may consider. Anything not on file reads exactly as such — never guessed."
        guide="Each factor comes from one of three places: what you entered directly in Onboarding/Settings, a default assumption used only when nothing was provided, or 'Insufficient information' when neither exists — the rule engine never invents a value to fill a gap."
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-2 h-4 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {businessContext.map((factor) => (
              <div key={factor.id}>
                <dt className="text-xs font-medium text-glow-text/50">{factor.label}</dt>
                <dd className={`mt-0.5 text-sm ${factor.insufficient ? 'italic text-glow-text/40' : 'text-glow-text/90'}`}>
                  {factor.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </GlowSection>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          [0, 1].map((i) => (
            <div key={i} className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-4 w-3/4" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-1.5 h-3 w-5/6" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Sparkles}
              message={
                recommendations.length === 0
                  ? 'No analytical conditions currently justify a recommendation — nothing is fabricated to fill this space.'
                  : 'No recommendations in this category right now.'
              }
            />
          </div>
        ) : (
          filtered.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))
        )}
      </div>
    </div>
  )
}
