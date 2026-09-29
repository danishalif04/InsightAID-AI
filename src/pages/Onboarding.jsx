import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, PackageSearch, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'
import ProgressBar from '@/components/ui/ProgressBar'
import { useNotifications } from '@/hooks/useNotifications'
import { PATHS } from '@/routes/paths'
import {
  PROFILE_GROUPS,
  PROVENANCE,
  PROVENANCE_META,
  calculateCompleteness,
  validateFieldValue,
} from '@/utils/businessProfileSchema'
import { extractProfile, getProfile, saveProfile } from '@/services/businessProfileService'
import BusinessPlanningPanel from '@/components/common/BusinessPlanningPanel'

const choiceCardClass =
  'rounded-card border border-line bg-surface p-6 text-left shadow-card transition-shadow hover:shadow-lg dark:border-line-dark dark:bg-surface-dark'

function ProvenanceTag({ tag }) {
  if (!tag) return null
  const meta = PROVENANCE_META[tag]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

function FieldControl({ field, value, onChange }) {
  if (field.type === 'multiselect') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="flex flex-wrap gap-2">
        {field.options.map((option) => {
          const isActive = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(isActive ? selected.filter((item) => item !== option) : [...selected, option])}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-accent-500 bg-accent-500 text-white'
                  : 'border-line bg-canvas text-slate-600 hover:bg-line dark:border-line-dark dark:bg-canvas-dark dark:text-slate-300'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <Input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export default function Onboarding() {
  const { notify } = useNotifications()
  const navigate = useNavigate()

  const [step, setStep] = useState('choice')
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [description, setDescription] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState({})
  const [provenance, setProvenance] = useState({})
  const [dataAvailabilityPath, setDataAvailabilityPath] = useState(null)

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((existing) => {
        if (cancelled) return
        if (existing.exists) {
          setValues(existing.values)
          setProvenance(existing.provenance)
          setDataAvailabilityPath(existing.dataAvailabilityPath)
          setStep('profile')
        }
      })
      .catch(() => {
        if (!cancelled) notify('Could not load your existing business profile.', 'error')
      })
      .finally(() => {
        if (!cancelled) setLoadingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [notify])

  const setFieldValue = (fieldId, rawValue) => {
    const { valid, value } = validateFieldValue(fieldId, rawValue)
    if (!valid) return
    setValues((current) => ({ ...current, [fieldId]: value }))
    setProvenance((current) => ({ ...current, [fieldId]: PROVENANCE.userProvided }))
  }

  const handleChooseHasData = async () => {
    setDataAvailabilityPath('has_data')
    try {
      await saveProfile({ values, provenance, dataAvailabilityPath: 'has_data' })
    } catch {
      // Non-fatal — still route them onward even if this first save attempt fails.
    }
    navigate(PATHS.datasets)
  }

  const handleChooseNoData = () => {
    setDataAvailabilityPath('no_data')
    setStep('describe')
  }

  const handleExtract = async () => {
    setExtracting(true)
    const result = await extractProfile(description)
    setExtracting(false)

    if (result.error) {
      notify(result.error, 'error')
      setStep('profile')
      return
    }

    const extractedValues = {}
    const extractedProvenance = {}
    for (const [fieldId, value] of Object.entries(result.profile)) {
      extractedValues[fieldId] = value
      extractedProvenance[fieldId] = PROVENANCE.aiExtracted
    }
    setValues((current) => ({ ...current, ...extractedValues }))
    setProvenance((current) => ({ ...current, ...extractedProvenance }))
    result.warnings.forEach((warning) => notify(warning, 'info'))
    notify(`Extracted ${Object.keys(result.profile).length} field(s) from your description.`)
    setStep('profile')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveProfile({ values, provenance, dataAvailabilityPath })
      notify('Business profile saved.')
      if (dataAvailabilityPath === 'no_data') {
        setStep('scenarios')
      } else {
        navigate(PATHS.dashboard)
      }
    } catch {
      notify('Could not save your profile — please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const { percent, missing } = calculateCompleteness(values)

  if (loadingExisting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (step === 'choice') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card bodyClassName="p-6 text-center">
          <h1 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
            Let&apos;s set up your business
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This helps InsightAid tailor the dashboard to your business — whether you already have data or are just
            getting started.
          </p>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button type="button" onClick={handleChooseHasData} className={choiceCardClass}>
            <Building2 className="size-6 text-accent-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">I have data</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              I have sales records, reviews, or social data I can upload or connect.
            </p>
          </button>
          <button type="button" onClick={handleChooseNoData} className={choiceCardClass}>
            <PackageSearch className="size-6 text-accent-500" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">I don&apos;t have data yet</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Describe your business idea and get scenario-based planning estimates instead.
            </p>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'describe') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card
          title="Describe your business"
          description="A few sentences is enough — mention your product, target customers, price, and expected sales if you know them."
        >
          <Textarea
            rows={6}
            placeholder="I want to start a small Malaysian skincare business selling affordable products through TikTok Shop and Shopee. My target customers are university students and young adults..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep('profile')}>
              Skip — I&apos;ll fill this in myself
            </Button>
            <Button icon={Sparkles} loading={extracting} disabled={!description.trim()} onClick={handleExtract}>
              Extract with AI
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (step === 'scenarios') {
    return (
      <div className="space-y-6">
        <BusinessPlanningPanel
          values={values}
          provenance={provenance}
          dataAvailabilityPath={dataAvailabilityPath}
        />
        <div className="flex justify-end">
          <Button icon={CheckCircle2} onClick={() => navigate(PATHS.dashboard)}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <ProgressBar value={percent} label="Business Profile completeness" />
        {missing.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Missing: {missing.map((field) => field.label).join(', ')}
          </p>
        )}
      </Card>

      {PROFILE_GROUPS.map((group) => (
        <Card key={group.id} title={group.label}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.fields.map((field) => (
              <div key={field.id} className={field.type === 'multiselect' ? 'sm:col-span-2' : ''}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{field.label}</span>
                  <ProvenanceTag tag={provenance[field.id]} />
                </div>
                <FieldControl field={field} value={values[field.id]} onChange={(value) => setFieldValue(field.id, value)} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button icon={CheckCircle2} loading={saving} onClick={handleSave}>
          Save Business Profile
        </Button>
      </div>
    </div>
  )
}
