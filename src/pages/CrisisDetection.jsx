import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Table from '@/components/ui/Table'
import ChartTooltip from '@/components/ui/ChartTooltip'
import { CHART_COLORS } from '@/theme/chartTheme'
import {
  CRISIS_LEVELS,
  anomalyTrend,
  currentCrisis,
  historicalCrisisLog,
  rootCauseSummary,
  statusCards,
} from '@/data/crisisData'

const LEVEL_META = {
  low: { label: 'Low', color: '#22c55e', tone: 'success' },
  medium: { label: 'Medium', color: '#d97706', tone: 'warning' },
  high: { label: 'High', color: '#ea580c', tone: 'danger' },
  critical: { label: 'Critical', color: '#991b1b', tone: 'danger' },
}

export default function CrisisDetection() {
  const levelIndex = CRISIS_LEVELS.indexOf(currentCrisis.level)
  const levelMeta = LEVEL_META[currentCrisis.level]

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
                Current Crisis Level
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-semibold" style={{ color: levelMeta.color }}>
                  {levelMeta.label}
                </p>
                <Badge tone={levelMeta.tone}>Risk score {currentCrisis.riskScore} / 100</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 lg:max-w-md">
            <div className="flex overflow-hidden rounded-full">
              {CRISIS_LEVELS.map((level, index) => (
                <span
                  key={level}
                  className="h-2 flex-1 border-r-2 border-surface last:border-r-0 dark:border-surface-dark"
                  style={{
                    backgroundColor: index <= levelIndex ? LEVEL_META[level].color : 'var(--color-line)',
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              {CRISIS_LEVELS.map((level) => (
                <span key={level} className={level === currentCrisis.level ? 'font-semibold text-slate-800 dark:text-slate-100' : ''}>
                  {LEVEL_META[level].label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.id} bodyClassName="p-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{card.value}</p>
            <p className="mt-1 text-xs text-slate-400">{card.description}</p>
          </Card>
        ))}
      </div>

      <Card title="24-Hour Anomaly Detection" description="Mention volume vs. adaptive baseline threshold">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={anomalyTrend} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="mentions"
              name="Mentions"
              stroke={CHART_COLORS.negative}
              fill={CHART_COLORS.negative}
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="threshold"
              name="Baseline threshold"
              stroke={CHART_COLORS.neutral}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card title="AI Root Cause Summary" description="Generated from correlated sentiment, volume, and keyword signals">
        <div className="flex gap-3 rounded-lg border border-line bg-canvas p-4 dark:border-line-dark dark:bg-canvas-dark">
          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{rootCauseSummary.summary}</p>
        </div>
        <ul className="mt-4 space-y-2">
          {rootCauseSummary.recommendedActions.map((action) => (
            <li key={action} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden="true" />
              {action}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Historical Crisis Log" description="Past incidents and how they were resolved">
        <Table
          columns={[
            { key: 'date', label: 'Date' },
            {
              key: 'level',
              label: 'Level',
              render: (row) => <Badge tone={LEVEL_META[row.level].tone}>{LEVEL_META[row.level].label}</Badge>,
            },
            { key: 'trigger', label: 'Trigger' },
            { key: 'duration', label: 'Duration' },
            { key: 'resolution', label: 'Resolution' },
          ]}
          data={historicalCrisisLog}
          getRowKey={(row) => row.id}
        />
      </Card>
    </div>
  )
}
