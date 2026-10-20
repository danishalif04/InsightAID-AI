import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw, SaveAll } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { CATEGORIES } from '@/utils/recommendationRules'
import { getRecommendations, saveRecommendations } from '@/services/recommendationService'

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' }

function RecommendationCard({ recommendation }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card bodyClassName="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{recommendation.category}</Badge>
        <Badge tone={PRIORITY_TONE[recommendation.priority]}>{recommendation.priority} priority</Badge>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
        {recommendation.title}
      </p>

      <ul className="mt-3 space-y-1">
        {recommendation.evidence.map((line) => (
          <li key={line} className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            • {line}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-xs font-medium text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark"
      >
        Why this recommendation?
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mt-2 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-slate-600 dark:bg-canvas-dark dark:text-slate-300">
          {recommendation.explainedBy === 'gemini' ? (
            <>
              <p>{recommendation.rationale}</p>
              {recommendation.context && <p className="mt-2">{recommendation.context}</p>}
              <p className="mt-2 text-[11px] text-slate-400">Explained by Gemini, from the evidence above only.</p>
            </>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              Gemini explanation unavailable right now — this recommendation is shown from the rule engine's
              evidence above, which is always real regardless of Gemini's availability.
            </p>
          )}
        </div>
      )}
    </Card>
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
  const [geminiAvailable, setGeminiAvailable] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const result = await getRecommendations(mode)
      setRecommendations(result.recommendations)
      setBusinessContext(result.businessContext)
      setGeminiAvailable(result.geminiAvailable)
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
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {['All', ...CATEGORIES].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === option
                    ? 'bg-accent-500 text-white'
                    : 'border border-line text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} loading={loading} onClick={load}>
              Regenerate
            </Button>
            <Button icon={SaveAll} loading={saving} disabled={recommendations.length === 0} onClick={handleSave} variant="secondary">
              Save
            </Button>
          </div>
        </div>
        {!loading && !geminiAvailable && recommendations.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Gemini explanations are unavailable right now — recommendations below are still real, rule-based
            results.
          </p>
        )}
      </Card>

      <Card
        title="Business Context"
        description="Factors these recommendations may consider. Anything not on file reads exactly as such — never guessed."
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {businessContext.map((factor) => (
            <div key={factor.id}>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{factor.label}</dt>
              <dd className={`mt-0.5 text-sm ${factor.insufficient ? 'italic text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                {factor.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {loading ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Running the rule engine…
          </p>
        ) : filtered.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {recommendations.length === 0
              ? 'No analytical conditions currently justify a recommendation — nothing is fabricated to fill this space.'
              : 'No recommendations in this category right now.'}
          </p>
        ) : (
          filtered.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} />)
        )}
      </div>
    </div>
  )
}
