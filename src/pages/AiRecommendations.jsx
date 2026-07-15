import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/ProgressBar'
import { useNotifications } from '@/hooks/useNotifications'
import { CATEGORIES, recommendationReserve, recommendations as initialRecommendations } from '@/data/recommendationsData'

const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'info' }

function RecommendationCard({ recommendation, onToggleAction }) {
  const [expanded, setExpanded] = useState(false)
  const doneCount = recommendation.actionChecklist.filter((item) => item.done).length

  return (
    <Card bodyClassName="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="brand">{recommendation.category}</Badge>
        <Badge tone={PRIORITY_TONE[recommendation.priority]}>{recommendation.priority} priority</Badge>
        <span className="ml-auto text-xs text-slate-400">{recommendation.timeframe}</span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
        {recommendation.title}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Impact Score</p>
          <ProgressBar value={recommendation.impactScore} className="mt-1.5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Confidence</p>
          <ProgressBar value={recommendation.confidence} tone="info" className="mt-1.5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Est. ROI</p>
          <p className="mt-1.5 text-sm font-semibold text-accent-600 dark:text-accent-400">+{recommendation.roi}%</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-xs font-medium text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark"
      >
        Why did the AI make this?
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <p className="mt-2 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-slate-600 dark:bg-canvas-dark dark:text-slate-300">
          {recommendation.reasoning}
        </p>
      )}

      <div className="mt-4 border-t border-line pt-3 dark:border-line-dark">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Action Checklist ({doneCount}/{recommendation.actionChecklist.length})
        </p>
        <ul className="space-y-2">
          {recommendation.actionChecklist.map((action) => (
            <li key={action.id}>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={action.done}
                  onChange={() => onToggleAction(recommendation.id, action.id)}
                  className="size-4 rounded border-line text-accent-500 focus:ring-accent-400 dark:border-line-dark"
                />
                <span className={action.done ? 'text-slate-400 line-through' : ''}>{action.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

export default function AiRecommendations() {
  const { notify } = useNotifications()
  const [category, setCategory] = useState('All')
  const [items, setItems] = useState(initialRecommendations)
  const [reserve, setReserve] = useState(recommendationReserve)
  const [generating, setGenerating] = useState(false)

  const filtered = category === 'All' ? items : items.filter((item) => item.category === category)

  const toggleAction = (recommendationId, actionId) => {
    setItems((current) =>
      current.map((rec) =>
        rec.id !== recommendationId
          ? rec
          : {
              ...rec,
              actionChecklist: rec.actionChecklist.map((action) =>
                action.id === actionId ? { ...action, done: !action.done } : action
              ),
            }
      )
    )
  }

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      if (reserve.length === 0) {
        notify('No new signals detected — recommendations are already up to date.', 'info')
        return
      }
      const [next, ...rest] = reserve
      setItems((current) => [next, ...current])
      setReserve(rest)
      notify('1 new recommendation generated from the latest signals.')
    }, 800)
  }

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
          <Button icon={Sparkles} loading={generating} onClick={handleGenerate}>
            Generate New
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((recommendation) => (
          <RecommendationCard key={recommendation.id} recommendation={recommendation} onToggleAction={toggleAction} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No recommendations in this category yet.
          </p>
        )}
      </div>
    </div>
  )
}
