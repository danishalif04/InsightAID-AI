import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, SaveAll, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { useNotifications } from '@/hooks/useNotifications'
import { getCrisisHistory, runCrisisDetection, saveCrisisEvent } from '@/services/crisisService'

const RISK_LEVELS = ['normal', 'warning', 'critical']

const LEVEL_META = {
  normal: { label: 'Normal', color: '#16a34a', tone: 'success' },
  warning: { label: 'Warning', color: '#d97706', tone: 'warning' },
  critical: { label: 'Critical', color: '#dc2626', tone: 'danger' },
}

const SIGNAL_LABELS = {
  negative_ratio_level: 'Negative sentiment ratio',
  negative_ratio_velocity: 'Negative sentiment velocity',
  mention_volume_level: 'Mention volume',
  mention_volume_velocity: 'Mention volume velocity',
  rating_deterioration: 'Rating deterioration',
  sentiment_anomaly: 'Sentiment anomaly',
  review_volume_anomaly: 'Review volume anomaly',
}

export default function CrisisDetection() {
  const { notify } = useNotifications()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])

  const loadCurrent = async () => {
    setLoading(true)
    try {
      const result = await runCrisisDetection()
      setCurrent(result)
    } catch (error) {
      notify(`Could not run crisis detection: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const rows = await getCrisisHistory()
      setHistory(rows)
    } catch (error) {
      notify(`Could not load crisis history: ${error.message}`)
    }
  }

  useEffect(() => {
    loadCurrent()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLog = async () => {
    if (!current) return
    setSaving(true)
    try {
      await saveCrisisEvent(current)
      notify('Detection logged to history.')
      await loadHistory()
    } catch (error) {
      notify(`Could not log this detection: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const levelMeta = current ? LEVEL_META[current.riskLevel] : LEVEL_META.normal
  const levelIndex = current ? RISK_LEVELS.indexOf(current.riskLevel) : 0

  return (
    <div className="space-y-6">
      <Card bodyClassName="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${levelMeta.color}1a` }}
            >
              <ShieldAlert className="size-6" style={{ color: levelMeta.color }} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Current Crisis Level (FYP2.md §52)
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-semibold" style={{ color: levelMeta.color }}>
                  {levelMeta.label}
                </p>
                <Badge tone={levelMeta.tone}>Risk score {current?.riskScore ?? 0} / 100</Badge>
                {current && !current.dataSufficient && <Badge tone="neutral">Limited data</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button icon={RefreshCw} loading={loading} onClick={loadCurrent}>
              Refresh
            </Button>
            <Button icon={SaveAll} loading={saving} disabled={!current} onClick={handleLog} variant="secondary">
              Log to history
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-1 flex-col gap-2">
          <div className="flex overflow-hidden rounded-full">
            {RISK_LEVELS.map((level, index) => (
              <span
                key={level}
                className="h-2 flex-1 border-r-2 border-surface last:border-r-0 dark:border-surface-dark"
                style={{ backgroundColor: index <= levelIndex ? LEVEL_META[level].color : 'var(--color-line)' }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            {RISK_LEVELS.map((level) => (
              <span
                key={level}
                className={current?.riskLevel === level ? 'font-semibold text-slate-800 dark:text-slate-100' : ''}
              >
                {LEVEL_META[level].label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card
        title="Detected Signals"
        description="Every signal this run could compute, with measurable evidence — never an unexplained AI-generated label (FYP2.md §53)"
      >
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Running detection…</p>
        ) : !current || current.allSignals.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No daily sentiment/mention data available yet — upload data via Dataset Management first.
          </p>
        ) : (
          <ul className="space-y-3">
            {current.allSignals.map((signal) => (
              <li key={signal.id} className="flex items-start gap-3 rounded-lg border border-line p-3 dark:border-line-dark">
                {signal.level === 'insufficient_data' ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                ) : signal.level === 'normal' ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: LEVEL_META[signal.level]?.color }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {SIGNAL_LABELS[signal.id] ?? signal.id}
                    </p>
                    {signal.level !== 'insufficient_data' && signal.level !== 'normal' && (
                      <Badge tone={LEVEL_META[signal.level].tone}>{LEVEL_META[signal.level].label}</Badge>
                    )}
                    {signal.level === 'insufficient_data' && <Badge tone="neutral">Not enough data</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{signal.evidence}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Detection History" description="Past logged detections for this business">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No detections logged yet — click "Log to history" above to record the current result.
          </p>
        ) : (
          <Table
            columns={[
              { key: 'detected_at', label: 'Detected', render: (row) => new Date(row.detected_at).toLocaleString() },
              {
                key: 'risk_level',
                label: 'Level',
                render: (row) => <Badge tone={LEVEL_META[row.risk_level]?.tone ?? 'neutral'}>{LEVEL_META[row.risk_level]?.label ?? row.risk_level}</Badge>,
              },
              { key: 'risk_score', label: 'Score' },
              { key: 'triggered_signals', label: 'Triggered', render: (row) => row.triggered_signals?.length ?? 0 },
              {
                key: 'data_sufficient',
                label: 'Data',
                render: (row) => (row.data_sufficient ? 'Sufficient' : 'Limited'),
              },
            ]}
            data={history}
            getRowKey={(row) => row.id}
          />
        )}
      </Card>
    </div>
  )
}
