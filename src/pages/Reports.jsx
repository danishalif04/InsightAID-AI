import { useState } from 'react'
import { Download, FileText, Table as TableIcon, X } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import AsyncSection from '@/components/common/AsyncSection'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { listReportTemplates, recordGenerated } from '@/services/reportsService'
import { generateReport } from '@/services/reportGenerationService'
import { exportReportCsv, exportReportPdf } from '@/utils/reportExport'

function DataTable({ title, tone, points }) {
  if (points.length === 0) return null
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === 'actual' ? 'text-accent-600 dark:text-accent-400' : 'text-amber-600 dark:text-amber-400'}`}>
        {title}
      </p>
      <div className="mt-1.5 overflow-x-auto rounded-lg border border-line dark:border-line-dark">
        <table className="w-full text-left text-xs">
          <tbody>
            {points.map((p, index) => (
              <tr key={`${p.label}-${index}`} className="border-b border-line/60 last:border-b-0 dark:border-line-dark/60">
                <td className="w-1/2 px-3 py-1.5 text-slate-500 dark:text-slate-400">{p.label}</td>
                <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-100">{String(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportSectionView({ section }) {
  return (
    <div className="border-b border-line py-4 last:border-b-0 dark:border-line-dark">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{section.title}</p>
      {section.narrative && <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.narrative}</p>}
      <DataTable title="Actual Data" tone="actual" points={section.actual} />
      <DataTable title="Scenario / Estimated Data" tone="scenario" points={section.scenario} />
      {section.note && <p className="mt-2 text-xs italic text-slate-400">{section.note}</p>}
    </div>
  )
}

export default function Reports() {
  const { notify } = useNotifications()
  const { mode } = useMode()
  const [generatingKey, setGeneratingKey] = useState(null)
  const [active, setActive] = useState(null)

  const { status, data: templates, error, reload } = useAsyncData(listReportTemplates, [])

  const handleGenerate = async (template) => {
    setGeneratingKey(template.builderKey)
    try {
      const { report, geminiAvailable } = await generateReport(template.builderKey, mode)
      setActive({ report, geminiAvailable })
      await recordGenerated(template.name, template.description)
      await reload()
    } catch (err) {
      notify(`Could not generate ${template.name}: ${err.message}`, 'error')
    } finally {
      setGeneratingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Reports" description="Generated from structured analytical outputs only — see FYP2.md §69-70">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Every report below clearly separates <span className="font-semibold text-accent-600 dark:text-accent-400">Actual Data</span> (measured from
          real, already-collected information) from <span className="font-semibold text-amber-600 dark:text-amber-400">Scenario / Estimated Data</span>{' '}
          (projections and assumptions). Every report ends with an Assumptions and Limitations section.
        </p>
      </Card>

      <AsyncSection status={status} data={templates} error={error} reload={reload}>
        {(templateList) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templateList.map((template) => (
              <Card key={template.name} bodyClassName="p-5">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{template.description}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {template.lastGenerated ? `Last generated ${template.lastGenerated}` : 'Never generated'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full"
                  loading={generatingKey === template.builderKey}
                  onClick={() => handleGenerate(template)}
                >
                  Generate
                </Button>
              </Card>
            ))}
          </div>
        )}
      </AsyncSection>

      {active && (
        <Card
          title={active.report.title}
          description={`Generated ${new Date(active.report.generatedAt).toLocaleString()} · Mode: ${active.report.mode}`}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" icon={FileText} onClick={() => exportReportPdf(active.report)}>
                Export PDF
              </Button>
              <Button size="sm" variant="secondary" icon={TableIcon} onClick={() => exportReportCsv(active.report)}>
                Export CSV
              </Button>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close report"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-canvas hover:text-slate-700 dark:hover:bg-canvas-dark dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>
          }
        >
          {!active.geminiAvailable && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-line bg-canvas p-3 text-xs text-slate-500 dark:border-line-dark dark:bg-canvas-dark dark:text-slate-400">
              <Download className="size-3.5 shrink-0" aria-hidden="true" />
              Gemini narrative explanations are unavailable right now — every section below still shows its real
              data (FYP2.md §55: rule-based/structured output must still work without Gemini).
            </div>
          )}
          <div>
            {active.report.sections.map((section) => (
              <ReportSectionView key={section.id} section={section} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge tone="success">Actual Data</Badge>
            <span className="text-xs text-slate-400">= measured from real, collected data</span>
            <Badge tone="warning" className="ml-4">
              Scenario / Estimated
            </Badge>
            <span className="text-xs text-slate-400">= projection or assumption, not a historical fact</span>
          </div>
        </Card>
      )}
    </div>
  )
}
