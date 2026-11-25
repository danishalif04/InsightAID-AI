import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import PageHero from '@/components/ui/PageHero'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import { useMode } from '@/hooks/useMode'
import metrics from '../../metrics/spark2026.json'

const VERDICT = {
  MET: { tone: 'success', icon: CheckCircle2 },
  PARTIAL: { tone: 'warning', icon: CircleDashed },
  'NOT MET': { tone: 'danger', icon: XCircle },
}

const MODEL_NAMES = {
  xlmr: 'XLM-RoBERTa', mbert: 'mBERT', tfidf_lr: 'TF-IDF + Logistic Regression',
  moving_average: 'Moving average', arima: 'ARIMA', prophet: 'Prophet', xgboost: 'XGBoost',
}
const PATH_NAMES = { original_language: 'Original language', translate_to_english: 'Translated to English' }
const LANGS = [['en', 'EN'], ['ms', 'BM'], ['zh', 'ZH']]

const pct = (v, d = 2) => (v == null ? 'N/A' : `${(v * 100).toFixed(d)}%`)
const num = (v, d = 2) => (v == null ? 'N/A' : v.toFixed(d))

function Verdict({ value }) {
  const v = VERDICT[value] ?? VERDICT['NOT MET']
  return <Badge tone={v.tone} icon={v.icon}>{value}</Badge>
}

function Objective({ code, title, target, verdict, children }) {
  return (
    <Card
      title={`${code}: ${title}`}
      description={`Target: ${target}`}
      actions={verdict ? <Verdict value={verdict} /> : null}
    >
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </Card>
  )
}

function Note({ children }) {
  return <p className="text-xs text-slate-500 dark:text-slate-400">{children}</p>
}

export default function ModelEvidence() {
  const { modeConfig } = useMode()
  const { o1, o2, o3, waste } = metrics

  const sentimentColumns = [
    { key: 'model', label: 'Model', render: (r) => MODEL_NAMES[r.model] ?? r.model },
    { key: 'path', label: 'Path', render: (r) => PATH_NAMES[r.evalPath] ?? r.evalPath },
    { key: 'acc', label: 'Overall', align: 'right', render: (r) => pct(r.accuracy) },
    ...LANGS.map(([k, label]) => ({ key: k, label, align: 'right', render: (r) => pct(r.perLanguage[k]?.accuracy) })),
    { key: 'met', label: 'Target', render: (r) => <Verdict value={r.targetMet ? 'MET' : 'NOT MET'} /> },
  ]

  const protocolColumns = [
    { key: 'name', label: 'Protocol' },
    { key: 'best', label: 'Best model', render: (r) => `${MODEL_NAMES[r.best.model] ?? r.best.model}` },
    { key: 'bestMape', label: 'Best MAPE', align: 'right', render: (r) => `${num(r.best.mape)}%` },
    { key: 'prophet', label: 'Prophet MAPE', align: 'right', render: (r) => (r.prophet ? `${num(r.prophet.mape)}%` : 'N/A') },
    { key: 'met', label: 'Target', render: (r) => <Verdict value={r.met ? 'MET' : 'NOT MET'} /> },
  ]

  const dmColumns = [
    { key: 'series', label: 'Series', render: (r) => `${r.protocol}, ${r.series.replace(/^olist_cat_/, '')}` },
    { key: 'so', label: 'Sales only', align: 'right', render: (r) => `${num(r.mapeSalesOnly)}%` },
    { key: 'se', label: 'With sentiment', align: 'right', render: (r) => `${num(r.mapeSentiment)}%` },
    { key: 'p', label: 'p value', align: 'right', render: (r) => num(r.p, 3) },
  ]

  const timingColumns = [
    { key: 'page', label: 'Page' },
    { key: 'median', label: 'Median', align: 'right', render: (r) => `${r.medianMs} ms` },
    { key: 'max', label: 'Slowest run', align: 'right', render: (r) => `${r.maxMs} ms` },
    { key: 'met', label: 'Target', render: (r) => <Verdict value={r.met ? 'MET' : 'NOT MET'} /> },
  ]

  const crisisNames = { scheme_a: 'Scheme A (7 signals)', scheme_b_raw: 'Scheme B, rule only', scheme_b_classified: 'Scheme B + classifier' }
  const crisisRows = Object.entries(o3.crisis.schemes).map(([id, s]) => ({ id, ...s }))
  const crisisColumns = [
    { key: 'id', label: 'Scheme', render: (r) => crisisNames[r.id] ?? r.id },
    { key: 'p', label: 'Precision', align: 'right', render: (r) => pct(r.precision, 0) },
    { key: 'r', label: 'Recall', align: 'right', render: (r) => pct(r.recall, 0) },
    { key: 'fa', label: 'False alarms on spikes', align: 'right', render: (r) => pct(r.falseAlarmRate, 0) },
    { key: 'lead', label: 'Mean lead time', align: 'right', render: (r) => `${num(r.meanLeadTimeDays, 1)} days` },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={modeConfig?.label}
        title="Model & Evidence"
        highlight="Evidence"
        description="Every research target, the measured result and whether it was met. Targets were fixed before development."
      />

      <Note>
        All values are read from result files in the repository by <code>{metrics.howToRebuild}</code>. Nothing on this page is typed in by hand.
      </Note>

      <Objective code="O1" title="Multilingual sentiment" target={o1.target} verdict={o1.verdict}>
        <Table columns={sentimentColumns} data={o1.models} getRowKey={(r) => `${r.model}-${r.evalPath}`} />
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500 dark:text-slate-400">
          {o1.notEvaluated.map((t) => <li key={t}>Not evaluated: {t}</li>)}
          <li>{o1.liveAppNote}</li>
        </ul>
      </Objective>

      <Objective code="O2a" title="Forecast accuracy" target={o2.mape.target} verdict={o2.mape.verdict}>
        <p>
          Met in {o2.mape.metCount} of {o2.mape.protocolCount} evaluation protocols.
        </p>
        <Table columns={protocolColumns} data={o2.mape.protocols} getRowKey={(r) => r.name} />
        <Note>{o2.dataNote}</Note>
      </Objective>

      <Objective code="O2b" title="Does sentiment improve the forecast?" target={o2.sentiment.target} verdict={o2.sentiment.verdict}>
        <p>
          With sentiment, MAPE was higher in {o2.sentiment.sentimentHigherMape} of {o2.sentiment.comparisons} comparisons.
          {' '}{o2.sentiment.significant === 0 ? 'No difference was statistically significant' : `${o2.sentiment.significant} differences were significant`}
          {' '}(p from {num(o2.sentiment.pMin, 3)} to {num(o2.sentiment.pMax, 3)}).
        </p>
        <Table columns={dmColumns} data={o2.sentiment.detail} getRowKey={(r) => `${r.protocol}-${r.series}`} />
        <Note>{o2.sentiment.caveat}</Note>
      </Objective>

      <Objective code="O3" title="Decision support: response time" target={o3.responseTime.target} verdict={o3.responseTime.verdict}>
        <p>
          {o3.responseTime.passing} of {o3.responseTime.pageCount} pages met the target on every run. Measured {o3.responseTime.measured}.
        </p>
        {o3.responseTime.caveat && <Note>{o3.responseTime.caveat}</Note>}
        <Table columns={timingColumns} data={o3.responseTime.pages} getRowKey={(r) => r.page} />
      </Objective>

      <Objective code="O3" title="Decision support: crisis alerts" target="Correct alerts (precision, recall, lead time)">
        <Table columns={crisisColumns} data={crisisRows} getRowKey={(r) => r.id} />
        <Note>{o3.crisis.note}</Note>
      </Objective>

      <Objective code="O3" title="Decision support: user acceptance" target={o3.uat.target}>
        <p>{o3.uat.source}</p>
      </Objective>

      <Card
        title="Prep & Stock Planner: waste replay"
        description={`${waste.label}. ${waste.dataset}, ${waste.from} to ${waste.to}, ${waste.settings.bufferPct}% safety buffer.`}
        actions={<Badge tone="warning">Simulated</Badge>}
      >
        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Waste, ordering like last week</p>
            <p className="text-2xl font-semibold tabular-nums">RM {num(waste.lastWeekHabit.wasteRM)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{waste.lastWeekHabit.stockoutUnits} units short</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Waste, ordering by forecast</p>
            <p className="text-2xl font-semibold tabular-nums">RM {num(waste.forecastHabit.wasteRM)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{waste.forecastHabit.stockoutUnits} units short</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Simulated saving</p>
            <p className="text-2xl font-semibold tabular-nums">RM {num(waste.savingRM)} ({num(waste.savingPct, 1)}%)</p>
          </div>
        </div>
        <p className="mt-4 text-sm">{waste.tradeOff}</p>
      </Card>
    </div>
  )
}
