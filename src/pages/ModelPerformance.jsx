import Badge from '@/components/ui/Badge'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import AsyncSection from '@/components/common/AsyncSection'
import { Gauge } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getModelPerformanceData } from '@/services/modelPerformanceService'
import { latestPerModelVariant, summarizeCrisisPerformance, summarizeForecastComparison } from '@/utils/modelPerformance'

const MODEL_TYPE_LABELS = { xlmr: 'XLM-RoBERTa', mbert: 'mBERT', tfidf_lr: 'TF-IDF + Logistic Regression' }
const EVAL_PATH_LABELS = { original_language: 'Original Language', translate_to_english: 'Translate to English' }

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function NotYetEvaluated({ children }) {
  return <p className="text-sm italic text-glow-text/50">{children}</p>
}

function MetricStat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-glow-text/50">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-glow-text">{value ?? '—'}</p>
    </div>
  )
}

function SentimentModelCard({ row }) {
  return (
    <div className="rounded-2xl border border-glow-border bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-glow-text">{MODEL_TYPE_LABELS[row.model_type] ?? row.model_type}</p>
        <Badge tone="neutral">{row.model_version}</Badge>
        <Badge tone="brand">{EVAL_PATH_LABELS[row.eval_path] ?? row.eval_path}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricStat label="Accuracy" value={row.accuracy != null ? `${(row.accuracy * 100).toFixed(1)}%` : null} />
        <MetricStat label="Precision" value={row.precision != null ? `${(row.precision * 100).toFixed(1)}%` : null} />
        <MetricStat label="Recall" value={row.recall != null ? `${(row.recall * 100).toFixed(1)}%` : null} />
        <MetricStat label="F1" value={row.f1 != null ? `${(row.f1 * 100).toFixed(1)}%` : null} />
      </div>

      {row.confusion_matrix && (
        <div className="mt-4">
          <p className="text-xs font-medium text-glow-text/50">Confusion Matrix (rows = true, cols = predicted)</p>
          <div className="mt-1.5 overflow-x-auto">
            <table className="text-xs">
              <tbody>
                {row.confusion_matrix.map((rowValues, i) => (
                  <tr key={i}>
                    {rowValues.map((value, j) => (
                      <td key={j} className="border border-glow-border px-2 py-1 text-center text-glow-text/80">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {row.per_language_metrics && Object.keys(row.per_language_metrics).length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-glow-text/50">Language Performance</p>
          <div className="mt-1.5 space-y-1">
            {Object.entries(row.per_language_metrics).map(([language, metrics]) => (
              <div key={language} className="flex items-center justify-between text-xs">
                <span className="font-medium text-glow-text/80">{language}</span>
                <span className="text-glow-text/50">
                  acc {(metrics.accuracy * 100).toFixed(1)}% · n={metrics.n}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-glow-text/40">
        Trained {new Date(row.trained_at).toLocaleDateString()} · {row.training_samples} train / {row.validation_samples} val /{' '}
        {row.test_samples} test samples
      </p>
    </div>
  )
}

export default function ModelPerformance() {
  const { status, data, error, reload } = useAsyncData(getModelPerformanceData, [])

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Model Scorecard"
        title="Model Performance"
        highlight="Performance"
        description="Real metrics only, straight from model_versions and forecast_results — never fabricated or rounded up."
      />

      <AsyncSection status={status} data={data} error={error} reload={reload}>
        {(pageData) => {
          const sentimentModels = latestPerModelVariant(pageData.modelVersions)
          const forecastComparison = summarizeForecastComparison(pageData.forecastRows)
          const crisisPerformance = summarizeCrisisPerformance(pageData.crisisHistory)

          return (
            <>
              <GlowSection title="Sentiment Models" description="Model, version, accuracy, precision, recall, F1, confusion matrix, language performance">
                {sentimentModels.length === 0 ? (
                  <EmptyState
                    icon={Gauge}
                    message="Not yet evaluated — no sentiment model training run has produced results yet. See ml/sentiment/README.md and docs/SENTIMENT_MODEL.md."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {sentimentModels.map((row) => (
                      <SentimentModelCard key={`${row.model_type}-${row.eval_path}`} row={row} />
                    ))}
                  </div>
                )}
              </GlowSection>

              <GlowSection title="Forecast Models" description="Baseline (sales-only) vs. sentiment-enhanced Prophet — MAE, RMSE, MAPE, improvement">
                {!forecastComparison ? (
                  <NotYetEvaluated>
                    Not yet evaluated — no forecasting run has produced a Prophet result yet. See ml/forecasting/README.md.
                  </NotYetEvaluated>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-glow-border text-xs uppercase tracking-wide text-glow-text/50">
                          <th className="py-2 pr-4 font-medium">Metric</th>
                          <th className="py-2 pr-4 font-medium">Baseline (sales-only)</th>
                          <th className="py-2 pr-4 font-medium">Enhanced (sentiment)</th>
                          <th className="py-2 font-medium">Improvement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'MAE', baseline: forecastComparison.baseline?.mae, enhanced: forecastComparison.enhanced?.mae, improvement: forecastComparison.maeImprovementPercent },
                          { label: 'RMSE', baseline: forecastComparison.baseline?.rmse, enhanced: forecastComparison.enhanced?.rmse, improvement: forecastComparison.rmseImprovementPercent },
                          { label: 'MAPE', baseline: forecastComparison.baseline?.mape, enhanced: forecastComparison.enhanced?.mape, improvement: forecastComparison.mapeImprovementPercent },
                        ].map((row) => (
                          <tr key={row.label} className="border-b border-glow-border/60">
                            <td className="py-2 pr-4 text-glow-text/80">{row.label}</td>
                            <td className="py-2 pr-4 text-glow-text/60">{row.baseline ?? 'Not yet evaluated'}</td>
                            <td className="py-2 pr-4 text-glow-text/60">{row.enhanced ?? 'Not yet evaluated'}</td>
                            <td className="py-2 text-glow-text/60">{row.improvement != null ? `${row.improvement}%` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlowSection>

              <GlowSection title="Crisis Detection Performance" description="Alerts, validated alerts, detection performance">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricStat label="Alerts logged" value={crisisPerformance.totalAlerts} />
                  <MetricStat label="Warning-level" value={crisisPerformance.warningAlerts} />
                  <MetricStat label="Critical-level" value={crisisPerformance.criticalAlerts} />
                </div>
                <p className="mt-4 text-sm italic text-glow-text/50">
                  Validated Alerts and Detection Performance (precision/recall against known outcomes) are
                  unavailable — no manually-labelled crisis ground-truth dataset exists in this project. The counts
                  above are real (from logged detections in Crisis Detection), not validated correctness figures.
                </p>
              </GlowSection>
            </>
          )
        }}
      </AsyncSection>
    </div>
  )
}
