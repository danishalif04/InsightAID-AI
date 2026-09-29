import { useMemo, useState } from 'react'
import { ChevronDown, Download, Gauge, Info, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import ProgressBar from '@/components/ui/ProgressBar'
import { useNotifications } from '@/hooks/useNotifications'
import { ALL_FIELDS, PROVENANCE } from '@/utils/businessProfileSchema'
import { saveProfile } from '@/services/businessProfileService'
import {
  buildAllScenarios,
  calculateBreakEven,
  calculateGrossMarginPercent,
  calculateMarketingCostRatioPercent,
} from '@/utils/scenarioEngine'
import { calculateReadiness } from '@/utils/dataReadiness'
import { CSV_TEMPLATES, downloadCsvTemplate } from '@/utils/csvTemplates'
import { DATA_COLLECTION_GUIDANCE } from '@/utils/dataCollectionGuidance'

const ASSUMPTION_FIELDS = ALL_FIELDS.filter((field) => field.table === 'assumptions')

const SCENARIO_META = {
  conservative: { label: 'Conservative', icon: TrendingDown, tone: 'neutral' },
  expected: { label: 'Expected', icon: Gauge, tone: 'brand' },
  growth: { label: 'Growth', icon: TrendingUp, tone: 'success' },
}

function money(value) {
  return value === null || value === undefined ? '—' : `RM ${value.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`
}

function ScenarioCard({ scenario }) {
  const [expanded, setExpanded] = useState(false)
  const meta = SCENARIO_META[scenario.caseType]
  const Icon = meta.icon

  return (
    <Card bodyClassName="p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-slate-400" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meta.label}</p>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Monthly Units</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{scenario.units ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Revenue</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{money(scenario.revenue)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Gross Profit</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{money(scenario.grossProfit)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-1.5 dark:border-line-dark">
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Operating Result</dt>
          <dd className="font-semibold text-slate-900 dark:text-slate-100">{money(scenario.operatingResult)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-4 flex w-full items-center justify-between rounded-lg border border-line px-3 py-2 text-xs font-medium text-slate-600 hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark"
      >
        Show formulas &amp; assumptions used
        <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1.5 rounded-lg bg-canvas p-3 text-xs leading-relaxed text-slate-600 dark:bg-canvas-dark dark:text-slate-300">
          {scenario.formulas.map((formula) => (
            <li key={formula.label}>
              <span className="font-medium text-slate-700 dark:text-slate-200">{formula.label}:</span> {formula.expression}
            </li>
          ))}
          {scenario.insufficientFields.length > 0 && (
            <li className="text-slate-400">
              Insufficient information to calculate: {scenario.insufficientFields.join(', ')}.
            </li>
          )}
        </ul>
      )}
    </Card>
  )
}

/**
 * Reusable "Business Planning Mode" panel (FYP2.md §28-34, §62). Mounted from
 * both the Onboarding no-data path and the Dashboard's additive no-data
 * section. Owns its own editable-assumptions form; the parent only needs to
 * hand it the currently-known profile values/provenance/data-availability-path.
 */
export default function BusinessPlanningPanel({ values, provenance, dataAvailabilityPath, onSaved }) {
  const { notify } = useNotifications()
  const [formValues, setFormValues] = useState(values ?? {})
  const [formProvenance, setFormProvenance] = useState(provenance ?? {})
  const [computedValues, setComputedValues] = useState(values ?? {})
  const [saving, setSaving] = useState(false)

  const scenarios = useMemo(() => buildAllScenarios(computedValues), [computedValues])
  const breakEven = useMemo(() => calculateBreakEven(computedValues), [computedValues])
  const grossMarginPercent = useMemo(
    () => calculateGrossMarginPercent(scenarios.expected.revenue, scenarios.expected.grossProfit),
    [scenarios]
  )
  const marketingCostRatioPercent = useMemo(
    () => calculateMarketingCostRatioPercent(computedValues.marketing_cost, scenarios.expected.revenue),
    [computedValues, scenarios]
  )
  const readiness = useMemo(() => calculateReadiness({ values: formValues }), [formValues])

  const updateField = (fieldId, rawValue) => {
    const numeric = rawValue === '' ? null : Number.parseFloat(rawValue)
    setFormValues((current) => ({ ...current, [fieldId]: Number.isFinite(numeric) ? numeric : null }))
    setFormProvenance((current) => ({ ...current, [fieldId]: PROVENANCE.userProvided }))
  }

  const handleRecalculate = () => setComputedValues(formValues)

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProfile({ values: formValues, provenance: formProvenance, dataAvailabilityPath })
      setComputedValues(formValues)
      notify('Assumptions saved and scenarios updated.')
      onSaved?.()
    } catch {
      notify('Could not save your assumptions — please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card bodyClassName="p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-semibold">Scenario Projection — not a historical forecast.</span> Every number below
            is calculated from your own assumptions using fixed formulas, not machine learning, and not a prediction
            based on past data.
          </p>
        </div>
      </Card>

      <Card title="Data Readiness" description={readiness.levelLabel}>
        <ProgressBar value={readiness.percent} label={`Level ${readiness.level} of 5`} />
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {readiness.checklist.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs dark:border-line-dark">
              <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
              <Badge tone={item.met ? 'success' : 'neutral'}>{item.met ? 'Have it' : 'Not yet'}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="Your Assumptions"
        description="Edit any figure and recalculate — no assumption is ranked as objectively best."
        actions={
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={handleRecalculate}>
            Recalculate
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ASSUMPTION_FIELDS.map((field) => (
            <Input
              key={field.id}
              label={field.label}
              type="number"
              value={formValues[field.id] ?? ''}
              onChange={(event) => updateField(field.id, event.target.value)}
            />
          ))}
        </div>
        <Button className="mt-4" loading={saving} onClick={handleSave}>
          Save Assumptions
        </Button>
      </Card>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Scenario Comparison</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Object.values(scenarios).map((scenario) => (
            <ScenarioCard key={scenario.caseType} scenario={scenario} />
          ))}
        </div>
      </div>

      <Card title="Break-Even &amp; Margins" description="Calculated from the Expected scenario">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Break-Even Units</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {breakEven.insufficient ? 'Insufficient data' : breakEven.units}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Break-Even Revenue</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {breakEven.insufficient ? 'Insufficient data' : money(breakEven.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Gross Margin</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {grossMarginPercent === null ? 'Insufficient data' : `${grossMarginPercent}%`}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Marketing Cost Ratio:{' '}
          {marketingCostRatioPercent === null ? 'Insufficient data' : `${marketingCostRatioPercent}%`}
        </p>
        {!breakEven.insufficient && <p className="mt-2 text-xs text-slate-400">{breakEven.formula}</p>}
      </Card>

      <Card title="Data You Could Collect Next" description="What to track so future analysis is more accurate">
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DATA_COLLECTION_GUIDANCE.map((item) => (
            <li key={item} className="text-xs text-slate-600 dark:text-slate-300">
              • {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Data Templates" description="Download, fill in, and keep for when you're ready to import real data">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CSV_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => downloadCsvTemplate(template.id)}
              className="flex flex-col items-center gap-2 rounded-lg border border-line p-4 text-xs font-medium text-slate-600 transition-colors hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark"
            >
              <Download className="size-4 text-accent-500" aria-hidden="true" />
              {template.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
