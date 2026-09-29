import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Presentation, Sparkles, Table } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { exportFormats, executiveSummaryPreview, reportTemplates } from '@/data/reportsData'

const FORMAT_ICONS = { pdf: FileText, excel: FileSpreadsheet, csv: Table, powerpoint: Presentation }

export default function Reports() {
  const { notify } = useNotifications()
  const { mode } = useMode()
  const [generating, setGenerating] = useState(null)
  const [activeReport, setActiveReport] = useState(null)

  const visibleTemplates = useMemo(
    () => reportTemplates.filter((template) => template.modes.includes(mode)),
    [mode]
  )

  const handleGenerate = (template) => {
    setGenerating(template.id)
    setTimeout(() => {
      setGenerating(null)
      setActiveReport(template)
    }, 700)
  }

  const handleGenerateSummary = () => {
    setGenerating('executive-summary')
    setTimeout(() => {
      setGenerating(null)
      setActiveReport({ id: 'executive-summary', name: 'AI Executive Summary', description: 'Generated just now' })
    }, 700)
  }

  const handleExport = (format) => {
    notify(`Exporting as ${format.label}...`)
  }

  return (
    <div className="space-y-6">
      <Card className="border-brand-900 bg-brand-950" bodyClassName="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
              <Sparkles className="size-4 text-accent-400" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">One-Click AI Executive Summary</p>
              <p className="mt-1 max-w-2xl text-sm text-brand-200">
                Generate a stakeholder-ready summary across sentiment, forecasting, and crisis signals in one click.
              </p>
            </div>
          </div>
          <Button
            loading={generating === 'executive-summary'}
            className="shrink-0 bg-accent-500 hover:bg-accent-600"
            onClick={handleGenerateSummary}
          >
            Generate Now
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTemplates.map((template) => (
          <Card key={template.id} bodyClassName="p-5">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{template.name}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{template.description}</p>
            <p className="mt-3 text-xs text-slate-400">Last generated {template.lastGenerated}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              loading={generating === template.id}
              onClick={() => handleGenerate(template)}
            >
              Generate
            </Button>
          </Card>
        ))}
      </div>

      <Card title="Export Options" description="Export the current view or a generated report">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {exportFormats.map((format) => {
            const Icon = FORMAT_ICONS[format.id]
            return (
              <button
                key={format.id}
                type="button"
                onClick={() => handleExport(format)}
                className="flex flex-col items-center gap-2 rounded-lg border border-line p-4 text-sm font-medium text-slate-600 transition-colors hover:bg-canvas dark:border-line-dark dark:text-slate-300 dark:hover:bg-canvas-dark"
              >
                <Icon className="size-5 text-accent-500" aria-hidden="true" />
                {format.label}
              </button>
            )
          })}
        </div>
      </Card>

      <Dialog
        open={Boolean(activeReport)}
        onClose={() => setActiveReport(null)}
        title={activeReport?.name}
        footer={exportFormats.map((format) => (
          <Button key={format.id} variant="secondary" size="sm" onClick={() => handleExport(format)}>
            {format.label}
          </Button>
        ))}
      >
        <p className="text-xs text-slate-400">{activeReport?.description}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{executiveSummaryPreview}</p>
      </Dialog>
    </div>
  )
}
