import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Database, Download, HardDrive, RefreshCw, UploadCloud, Wifi, WifiOff } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Dialog from '@/components/ui/Dialog'
import PageHero from '@/components/ui/PageHero'
import InfoPopover from '@/components/ui/InfoPopover'
import { useNotifications } from '@/hooks/useNotifications'
import { useMode } from '@/hooks/useMode'
import { parseCsv } from '@/utils/csvParser'
import { parseXlsx } from '@/utils/excelParser'
import { inferTemplateId } from '@/utils/datasetValidation'
import { computeLanguageBreakdown } from '@/utils/socialAnalytics'
import { ingestRows, seedFixtureSample } from '@/services/dataPipelineService'
import { fetchLanguages } from '@/services/socialDataService'
import { fetchForecastSalesRows, fetchForecastSentimentRegressorRows, fetchSentimentTrainingRows } from '@/services/mlExportService'
import { downloadCsv } from '@/utils/csvExport'
import { getAllSourceStatuses } from '@/adapters/registry'
import { SOURCE_STATUS } from '@/adapters/sourceStatus'

const STATUS_TONE = { success: 'success', warning: 'warning', error: 'danger' }

// Mirrors FYP2.md §39's supported API status vocabulary — never render a fake "Connected".
const CONNECTION_STATUS_META = {
  [SOURCE_STATUS.CONNECTED]: { label: 'Connected', tone: 'success', icon: Wifi },
  [SOURCE_STATUS.NOT_CONFIGURED]: { label: 'Not Configured', tone: 'neutral', icon: WifiOff },
  [SOURCE_STATUS.AUTH_REQUIRED]: { label: 'Auth Required', tone: 'warning', icon: AlertCircle },
  [SOURCE_STATUS.RATE_LIMITED]: { label: 'Rate Limited', tone: 'warning', icon: AlertCircle },
  [SOURCE_STATUS.ERROR]: { label: 'Error', tone: 'danger', icon: AlertCircle },
  [SOURCE_STATUS.DISABLED]: { label: 'Disabled', tone: 'neutral', icon: WifiOff },
}

function GlowSection({ title, description, guide, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && (
        <h2 className="flex items-center gap-1 text-sm font-semibold text-glow-text">
          {title}
          {guide && <InfoPopover guide={guide} label={`About ${title}`} />}
        </h2>
      )}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function formatTimestamp(value) {
  if (!value) return 'Never synced'
  return `Last sync: ${new Date(value).toLocaleString('en-MY')}`
}

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${(bytes / 1_000).toFixed(0)} KB`
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

/** Parses an uploaded file into { headers, records } — CSV, JSON (array of objects), and Excel (.xlsx/.xls, first sheet only). */
async function parseUploadedFile(file) {
  const name = file.name.toLowerCase()
  const isJson = name.endsWith('.json')
  const isCsv = name.endsWith('.csv')
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls')

  if (!isJson && !isCsv && !isExcel) {
    throw new Error(`${file.name}: only .csv, .json, and .xlsx/.xls are supported.`)
  }

  if (isExcel) {
    const buffer = await readFileAsArrayBuffer(file)
    return parseXlsx(buffer)
  }

  const text = await readFileAsText(file)

  if (isJson) {
    const parsed = JSON.parse(text)
    const records = Array.isArray(parsed) ? parsed : [parsed]
    const headers = records.length > 0 ? Object.keys(records[0]) : []
    return { headers, records }
  }

  return parseCsv(text)
}

export default function DatasetManagement() {
  const { notify } = useNotifications()
  const { mode } = useMode()
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [imports, setImports] = useState([])
  const [sources, setSources] = useState([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [syncingId, setSyncingId] = useState(null)
  const [seeding, setSeeding] = useState(false)
  const [reportDialog, setReportDialog] = useState(null)
  const [languageBreakdown, setLanguageBreakdown] = useState(null)
  const [exportingId, setExportingId] = useState(null)

  const refreshSources = async () => {
    try {
      setSources(await getAllSourceStatuses())
    } catch {
      notify('Could not load data source statuses.', 'error')
    } finally {
      setLoadingSources(false)
    }
  }

  const refreshLanguages = async () => {
    try {
      setLanguageBreakdown(computeLanguageBreakdown(await fetchLanguages()))
    } catch {
      setLanguageBreakdown([])
    }
  }

  useEffect(() => {
    refreshSources()
    refreshLanguages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleSources = useMemo(() => sources.filter((source) => source.modes.includes(mode)), [sources, mode])

  const recordImportResult = ({ file, size, templateId, result }) => {
    const { validation, rawCount, processedCount } = result
    const status = !validation.readyForProcessing ? 'error' : validation.warnings.length > 0 ? 'warning' : 'success'
    setImports((current) => [
      {
        id: `imp-${Date.now()}-${file}`,
        file,
        size,
        templateId,
        records: rawCount,
        processedCount,
        quality: validation.warnings.length === 0 ? 100 : Math.max(0, 100 - validation.warnings.length * 10),
        status,
        validation,
      },
      ...current,
    ])
  }

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      try {
        const { headers, records } = await parseUploadedFile(file)
        // Never null anymore — unmatched headers fall back to 'custom'
        // rather than rejecting the file outright (FYP2.md §35).
        const templateId = inferTemplateId(headers)

        const source = file.name.toLowerCase().endsWith('.json') ? 'json_upload' : 'csv_upload'
        const result = await ingestRows(templateId, records, source, file.name)
        recordImportResult({ file: file.name, size: file.size, templateId, result })

        if (templateId === 'custom') {
          notify(`${file.name}: columns didn't match a known template, stored as-is (${result.rawCount} row(s)), not deeply analyzed.`, 'info')
        } else if (result.validation.readyForProcessing) {
          notify(`${file.name} imported as "${templateId}", ${result.rawCount} row(s), ${result.validation.warnings.length} warning(s).`)
        } else {
          notify(`${file.name} could not be fully processed. See the validation report.`, 'error')
        }
      } catch (error) {
        notify(error.message ?? `Could not read ${file.name}.`, 'error')
      }
    }
    refreshSources()
    refreshLanguages()
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files)
  }

  const handleSync = async (source) => {
    setSyncingId(source.id)
    try {
      const result = await source.sync()
      notify(result.message, result.status === SOURCE_STATUS.CONNECTED ? 'success' : 'info')
    } catch (error) {
      notify(error.message ?? `Could not sync ${source.name}.`, 'error')
    } finally {
      setSyncingId(null)
      refreshSources()
    }
  }

  const handleTrainingExport = async (id, fetchRows, filename, schemaLabel) => {
    setExportingId(id)
    try {
      const rows = await fetchRows()
      if (rows.length === 0) {
        notify('No matching data yet. Upload or sync data first.', 'info')
        return
      }
      downloadCsv(filename, rows)
      notify(`Exported ${rows.length} row(s) to ${filename}, matches ${schemaLabel}.`)
    } catch (error) {
      notify(error.message ?? `Could not export ${filename}.`, 'error')
    } finally {
      setExportingId(null)
    }
  }

  const handleSeedSample = async () => {
    setSeeding(true)
    try {
      const { reviews, social } = await seedFixtureSample()
      recordImportResult({ file: 'sample_reviews.csv', size: 0, templateId: 'reviews', result: reviews })
      recordImportResult({ file: 'sample_social.csv', size: 0, templateId: 'social', result: social })
      notify('Sample dataset loaded through the real pipeline (validation, preprocessing, feature engineering).')
    } catch {
      notify('Could not load the sample dataset, please try again.', 'error')
    } finally {
      setSeeding(false)
      refreshSources()
      refreshLanguages()
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Pipeline"
        title="Dataset Management"
        highlight="Dataset"
        description="Upload, sync, and export the real data every other page reads from, nothing here is simulated."
      />

      <GlowSection
        title="Upload Dataset"
        description="CSV, JSON, or Excel, up to 100 MB per file. Matches a known template (Sales, Reviews, Social, Product, Expenses) automatically where possible, including common column-name variants; anything that doesn't match is still stored, just not deeply analyzed."
      >
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
            dragActive ? 'border-glow-brand bg-glow-brand/10' : 'border-glow-border'
          }`}
        >
          <UploadCloud className="size-8 text-glow-brand" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-glow-text">Drag and drop files here, or click to browse</p>
          <p className="mt-1 text-xs text-glow-text/40">CSV, JSON, or Excel (.xlsx/.xls)</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="glowSecondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Browse Files
            </Button>
            <Button variant="glowSecondary" size="sm" icon={Database} loading={seeding} onClick={handleSeedSample}>
              Load Sample Dataset
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.xlsx,.xls"
            className="hidden"
            onChange={(event) => event.target.files && handleFiles(event.target.files)}
          />
        </div>
      </GlowSection>

      <GlowSection title="Data Source Status" description="Every source is checked independently, one failing never affects the others">
        {loadingSources ? (
          <p className="text-sm text-glow-text/60">Checking source status…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {visibleSources.map((source) => {
              const meta = CONNECTION_STATUS_META[source.status]
              const StatusIcon = meta.icon
              return (
                <div key={source.id} className="rounded-2xl border border-glow-border bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-glow-text">
                      <StatusIcon
                        className={`size-4 ${source.status === SOURCE_STATUS.CONNECTED ? 'text-glow-brand' : 'text-glow-text/40'}`}
                        aria-hidden="true"
                      />
                      {source.name}
                    </span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-glow-text/40">{formatTimestamp(source.lastSync)}</p>
                  <p className="text-xs text-glow-text/40">{source.recordCount ?? 0} record(s)</p>
                  {source.detail && <p className="mt-1 text-xs text-amber-400">{source.detail}</p>}
                  <Button
                    variant="glowSecondary"
                    size="sm"
                    icon={RefreshCw}
                    loading={syncingId === source.id}
                    className="mt-3 w-full"
                    onClick={() => handleSync(source)}
                  >
                    Sync
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </GlowSection>

      <GlowSection title="Storage & Language Mix" description="Storage quota, plus the detected language mix across everything ingested so far">
        <div className="flex items-center gap-2 text-sm italic text-glow-text/50">
          <HardDrive className="size-4 text-glow-text/40" aria-hidden="true" />
          Unavailable, storage quota is Supabase project infrastructure, not something this app's client-side
          credentials can query.
        </div>

        <p className="mt-5 mb-2 flex items-center gap-1 text-xs font-medium text-glow-text/50">
          Language detection breakdown
          <InfoPopover
            label="About language detection"
            guide="A rule-based detector, not a trained language-ID model: character-ratio for Chinese, function-word matching for Malay/English. Text with a comparable mix of both Malay and English function words is tagged 'ms-en' (code-mixed) rather than forced into one language."
          />
        </p>
        {languageBreakdown === null ? (
          <p className="text-sm text-glow-text/60">Loading…</p>
        ) : languageBreakdown.length === 0 ? (
          <p className="text-sm text-glow-text/60">No text data ingested yet.</p>
        ) : (
          <div className="space-y-2">
            {languageBreakdown.map((item, index) => (
              <div key={item.code}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-glow-text/80">{item.language}</span>
                  <span className="text-glow-text/50">{item.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${item.percent}%`, backgroundColor: ['#22c55e', '#60a5fa', '#a8a29e', '#f59e0b', '#94a3b8'][index % 5] }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowSection>

      <GlowSection
        title="ML Training Data Export"
        description="Real rows from processed_data/daily_aggregates, shaped to match the offline training pipelines in ml/sentiment and ml/forecasting. Nothing is trained here, this only exports what's already been ingested."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            variant="glowSecondary"
            size="sm"
            icon={Download}
            loading={exportingId === 'sentiment'}
            onClick={() => handleTrainingExport('sentiment', fetchSentimentTrainingRows, 'sentiment_training_export.csv', 'ml/sentiment/data/schema.md')}
          >
            Sentiment Training CSV
          </Button>
          <Button
            variant="glowSecondary"
            size="sm"
            icon={Download}
            loading={exportingId === 'forecast_sales'}
            onClick={() => handleTrainingExport('forecast_sales', fetchForecastSalesRows, 'forecast_sales_export.csv', 'ml/forecasting/data/schema.md (Input 1)')}
          >
            Forecast Sales CSV
          </Button>
          <Button
            variant="glowSecondary"
            size="sm"
            icon={Download}
            loading={exportingId === 'forecast_regressors'}
            onClick={() =>
              handleTrainingExport(
                'forecast_regressors',
                fetchForecastSentimentRegressorRows,
                'forecast_sentiment_regressors_export.csv',
                'ml/forecasting/data/schema.md (Input 2)'
              )
            }
          >
            Forecast Sentiment Regressors CSV
          </Button>
        </div>
      </GlowSection>

      <GlowSection title="Recent Imports" description="Real uploads and sample data run through the pipeline this session">
        <Table
          columns={[
            { key: 'file', label: 'File' },
            { key: 'size', label: 'Size', align: 'right', render: (row) => (row.size ? formatBytes(row.size) : 'N/A') },
            { key: 'records', label: 'Rows', align: 'right', render: (row) => row.records.toLocaleString() },
            { key: 'quality', label: 'Quality', align: 'right', render: (row) => `${row.quality}%` },
            {
              key: 'status',
              label: 'Status',
              align: 'right',
              render: (row) => (
                <Badge tone={STATUS_TONE[row.status]}>
                  {row.status === 'success' && <CheckCircle2 className="size-3" />}
                  {row.status}
                </Badge>
              ),
            },
            {
              key: 'report',
              label: '',
              align: 'right',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => setReportDialog(row)}
                  className="text-xs font-medium text-glow-brand hover:underline"
                >
                  View report
                </button>
              ),
            },
          ]}
          data={imports}
          getRowKey={(row) => row.id}
          emptyMessage="No datasets imported yet this session. Upload a file or load the sample dataset above."
        />
      </GlowSection>

      <Dialog open={Boolean(reportDialog)} onClose={() => setReportDialog(null)} title={`Validation report, ${reportDialog?.file ?? ''}`}>
        {reportDialog && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Template: {reportDialog.templateId} · {reportDialog.records} row(s) · {reportDialog.processedCount} processed
              into the normalized schema
            </p>
            <ul className="space-y-1.5">
              {reportDialog.validation.checks.map((check) => (
                <li key={check} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden="true" />
                  {check}
                </li>
              ))}
              {reportDialog.validation.warnings.map((warning) => (
                <li key={warning} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
                  {warning}
                </li>
              ))}
            </ul>
            <p className="border-t border-line pt-3 text-xs font-medium dark:border-line-dark">
              Ready for processing: {reportDialog.validation.readyForProcessing ? 'YES' : 'NO'}
            </p>
          </div>
        )}
      </Dialog>
    </div>
  )
}
