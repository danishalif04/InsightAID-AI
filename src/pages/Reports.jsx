import { useState } from 'react'
import { Download, FileStack, FileText, Table as TableIcon, X } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import PageHero from '@/components/ui/PageHero'
import EmptyState from '@/components/ui/EmptyState'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { listReportTemplates, recordGenerated } from '@/services/reportsService'
import { generateReport } from '@/services/reportGenerationService'
import { exportReportCsv, exportReportPdf } from '@/utils/reportExport'

function GlowSection({ title, description, children, className = '', actions }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {(title || description || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function DataTable({ title, tone, points }) {
  if (points.length === 0) return null
  return (
    <div className="mt-3">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone === 'actual' ? 'text-glow-brand' : 'text-amber-400'}`}>
        {title}
      </p>
      <div className="mt-1.5 overflow-x-auto rounded-2xl border border-glow-border">
        <table className="w-full text-left text-xs">
          <tbody>
            {points.map((p, index) => (
              <tr key={`${p.label}-${index}`} className="border-b border-glow-border/60 last:border-b-0">
                <td className="w-1/2 px-3 py-1.5 text-glow-text/50">{p.label}</td>
                <td className="px-3 py-1.5 font-medium text-glow-text/90">{String(p.value)}</td>
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
    <div className="border-b border-glow-border py-4 last:border-b-0">
      <p className="text-sm font-semibold text-glow-text">{section.title}</p>
      {section.narrative && <p className="mt-1.5 text-sm leading-relaxed text-glow-text/70">{section.narrative}</p>}
      <DataTable title="Actual Data" tone="actual" points={section.actual} />
      <DataTable title="Scenario / Estimated Data" tone="scenario" points={section.scenario} />
      {section.note && <p className="mt-2 text-xs italic text-glow-text/40">{section.note}</p>}
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
      <PageHero
        eyebrow="Documentation"
        title="Reports"
        highlight="Reports"
        description="Generated from structured analytical outputs only. Actual data and scenario/estimated data are always kept visually separate."
      />

      {status === 'error' ? (
        <GlowSection>
          <EmptyState icon={FileStack} message={error?.message ?? 'Could not load report templates.'} actionLabel="Retry" onAction={reload} />
        </GlowSection>
      ) : status !== 'success' || !templates ? (
        <GlowSection>
          <p className="text-sm text-glow-text/60">Loading report templates…</p>
        </GlowSection>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div key={template.name} className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
              <p className="text-sm font-semibold text-glow-text">{template.name}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-glow-text/50">{template.description}</p>
              <p className="mt-3 text-xs text-glow-text/40">
                {template.lastGenerated ? `Last generated ${template.lastGenerated}` : 'Never generated'}
              </p>
              <Button
                variant="glowSecondary"
                size="sm"
                className="mt-4 w-full"
                loading={generatingKey === template.builderKey}
                onClick={() => handleGenerate(template)}
              >
                Generate
              </Button>
            </div>
          ))}
        </div>
      )}

      {active && (
        <GlowSection
          title={active.report.title}
          description={`Generated ${new Date(active.report.generatedAt).toLocaleString()} · Mode: ${active.report.mode}`}
          actions={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="glowBrand" icon={FileText} onClick={() => exportReportPdf(active.report)}>
                Export PDF
              </Button>
              <Button size="sm" variant="glowSecondary" icon={TableIcon} onClick={() => exportReportCsv(active.report)}>
                Export CSV
              </Button>
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close report"
                className="rounded-full p-1.5 text-glow-text/40 hover:bg-white/5 hover:text-glow-text/70"
              >
                <X className="size-4" />
              </button>
            </div>
          }
        >
          {!active.geminiAvailable && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-glow-border bg-white/[0.02] p-3 text-xs text-glow-text/50">
              <Download className="size-3.5 shrink-0" aria-hidden="true" />
              Gemini narrative explanations are unavailable right now, every section below still shows its real
              data.
            </div>
          )}
          <div>
            {active.report.sections.map((section) => (
              <ReportSectionView key={section.id} section={section} />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge tone="success">Actual Data</Badge>
            <span className="text-xs text-glow-text/40">= measured from real, collected data</span>
            <Badge tone="warning" className="ml-4">
              Scenario / Estimated
            </Badge>
            <span className="text-xs text-glow-text/40">= projection or assumption, not a historical fact</span>
          </div>
        </GlowSection>
      )}
    </div>
  )
}
