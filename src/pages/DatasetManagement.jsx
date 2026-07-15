import { useRef, useState } from 'react'
import { CheckCircle2, HardDrive, RefreshCw, UploadCloud, Wifi } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import ProgressBar from '@/components/ui/ProgressBar'
import { useNotifications } from '@/hooks/useNotifications'
import { apiConnections, recentImports as initialImports, storageUsage } from '@/data/datasetData'

const STATUS_TONE = { success: 'success', warning: 'warning', error: 'danger' }
const LANGUAGE_COLORS = ['#22c55e', '#60a5fa', '#a8a29e']

function formatBytes(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
  return `${(bytes / 1_000).toFixed(0)} KB`
}

export default function DatasetManagement() {
  const { notify } = useNotifications()
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [imports, setImports] = useState(initialImports)
  const [syncingId, setSyncingId] = useState(null)

  const handleFiles = (files) => {
    Array.from(files).forEach((file) => {
      const id = `imp-${Date.now()}-${file.name}`
      setImports((current) => [
        { id, file: file.name, size: file.size, records: 0, quality: 0, status: 'processing' },
        ...current,
      ])
      setTimeout(() => {
        setImports((current) =>
          current.map((row) =>
            row.id === id
              ? { ...row, records: Math.floor(Math.random() * 20000) + 500, quality: Math.floor(Math.random() * 15) + 85, status: 'success' }
              : row
          )
        )
        notify(`${file.name} imported successfully.`)
      }, 1200)
    })
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files)
  }

  const handleSync = (connection) => {
    setSyncingId(connection.id)
    setTimeout(() => {
      setSyncingId(null)
      notify(`${connection.name} synced successfully.`)
    }, 900)
  }

  return (
    <div className="space-y-6">
      <Card title="Upload Dataset" description="CSV, JSON, or XLSX — up to 100 MB per file">
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
            dragActive
              ? 'border-accent-500 bg-accent-50 dark:bg-accent-500/10'
              : 'border-line dark:border-line-dark'
          }`}
        >
          <UploadCloud className="size-8 text-accent-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            Drag and drop files here, or click to browse
          </p>
          <p className="mt-1 text-xs text-slate-400">CSV, JSON, XLSX up to 100 MB</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.json,.xlsx"
            className="hidden"
            onChange={(event) => event.target.files && handleFiles(event.target.files)}
          />
        </div>
      </Card>

      <Card title="API Connection Status" description="Live data sources feeding this workspace">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {apiConnections.map((connection) => (
            <div key={connection.id} className="rounded-lg border border-line p-4 dark:border-line-dark">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                  <Wifi className="size-4 text-accent-500" aria-hidden="true" />
                  {connection.name}
                </span>
                <Badge tone="success">Connected</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-400">Last sync: {connection.lastSync}</p>
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                loading={syncingId === connection.id}
                className="mt-3 w-full"
                onClick={() => handleSync(connection)}
              >
                Sync
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Storage Usage" description="Workspace storage and detected language mix">
        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <HardDrive className="size-4 text-slate-400" aria-hidden="true" />
          {storageUsage.usedGB} GB of {storageUsage.totalGB} GB used
        </div>
        <ProgressBar value={storageUsage.usedGB} max={storageUsage.totalGB} className="mt-2" />

        <p className="mt-5 mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">Language detection breakdown</p>
        <div className="space-y-2">
          {storageUsage.languageBreakdown.map((item, index) => (
            <div key={item.code}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{item.language}</span>
                <span className="text-slate-500 dark:text-slate-400">{item.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line dark:bg-line-dark">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.percent}%`, backgroundColor: LANGUAGE_COLORS[index] }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Imports" description="History of uploaded datasets and data quality">
        <Table
          columns={[
            { key: 'file', label: 'File' },
            { key: 'size', label: 'Size', align: 'right', render: (row) => formatBytes(row.size) },
            { key: 'records', label: 'Records', align: 'right', render: (row) => row.records.toLocaleString() },
            {
              key: 'quality',
              label: 'Quality',
              align: 'right',
              render: (row) => (row.status === 'processing' ? '—' : `${row.quality}%`),
            },
            {
              key: 'status',
              label: 'Status',
              align: 'right',
              render: (row) =>
                row.status === 'processing' ? (
                  <Badge tone="info">Processing…</Badge>
                ) : (
                  <Badge tone={STATUS_TONE[row.status]}>
                    {row.status === 'success' && <CheckCircle2 className="size-3" />}
                    {row.status}
                  </Badge>
                ),
            },
          ]}
          data={imports}
          getRowKey={(row) => row.id}
        />
      </Card>
    </div>
  )
}
