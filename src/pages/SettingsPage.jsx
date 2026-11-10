import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  Camera,
  Database as DatabaseIcon,
  Globe,
  Info,
  KeyRound,
  Moon,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import PageHero from '@/components/ui/PageHero'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { Input, Select } from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import UIModeSwitcher from '@/components/common/UIModeSwitcher'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme } from '@/hooks/useTheme'
import { getMyProfile, updateMyProfile } from '@/services/profileService'
import { getApiKeys, getCompany, getPreferences, saveCompany, savePreferences } from '@/services/settingsService'
import { resetUploadedDatasets } from '@/services/accountResetService'
import { supabase } from '@/config/supabaseClient'
import { NOTIFICATION_PREFERENCE_DEFINITIONS } from '@/config/notificationPreferences'
import { initialsFromName } from '@/utils/formatters'
import { PATHS } from '@/routes/paths'

const ABOUT_INFO = {
  version: '0.1.0',
  fullTitle: 'InsightAid AI — An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups',
  student: 'Muhammad Danish Alif Bin Azrul (22006390)',
  supervisor: 'See project documentation',
  institution: 'Universiti Teknologi PETRONAS',
}

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'language-theme', label: 'Language & Theme', icon: Globe },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'model-config', label: 'Model & Detection', icon: SlidersHorizontal },
  { id: 'database', label: 'Database', icon: DatabaseIcon },
  { id: 'about', label: 'About', icon: Info },
]

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-6 ${className}`}>
      {title && <h2 className="text-sm font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-0.5 text-xs text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  )
}

function SectionLoading() {
  return <p className="text-sm text-glow-text/60">Loading…</p>
}

function ProfileSection() {
  const { notify } = useNotifications()
  const { data: profile } = useAsyncData(getMyProfile, [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ full_name: profile?.full_name ?? '', email: profile?.email ?? '', role: profile?.role ?? '', phone: profile?.phone ?? '' })
  }, [profile])

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMyProfile(form)
      notify('Profile changes saved.')
    } catch (error) {
      notify(`Could not save profile: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!form) return <SectionLoading />

  return (
    <GlowSection title="Profile">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-glow-brand/15 text-lg font-semibold text-glow-brand">
          {initialsFromName(form.full_name)}
        </span>
        <Button variant="glowSecondary" size="sm" icon={Camera} onClick={() => notify('Photo upload is not implemented yet.', 'info')}>
          Change Photo
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full Name" value={form.full_name} onChange={update('full_name')} />
        <Input label="Email" type="email" value={form.email} onChange={update('email')} />
        <Input label="Role" value={form.role} onChange={update('role')} />
        <Input label="Phone" value={form.phone} onChange={update('phone')} />
      </div>
      <Button variant="glowBrand" className="mt-6" loading={saving} onClick={handleSave}>
        Save Changes
      </Button>
    </GlowSection>
  )
}

function CompanySection() {
  const { notify } = useNotifications()
  const { data: company } = useAsyncData(getCompany, [])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm({ name: company?.name ?? '', industry: company?.industry ?? '', size: company?.size ?? '', website: company?.website ?? '' })
  }, [company])

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveCompany(form)
      notify('Company details saved.')
    } catch (error) {
      notify(`Could not save company details: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!form) return <SectionLoading />

  return (
    <GlowSection title="Company">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Company Name" value={form.name} onChange={update('name')} />
        <Input label="Industry" value={form.industry} onChange={update('industry')} />
        <Input label="Company Size" value={form.size} onChange={update('size')} />
        <Input label="Website" value={form.website} onChange={update('website')} />
      </div>
      <Button variant="glowBrand" className="mt-6" loading={saving} onClick={handleSave}>
        Save Changes
      </Button>
    </GlowSection>
  )
}

function NotificationsSection() {
  const { notify } = useNotifications()
  const { data: preferences } = useAsyncData(getPreferences, [])
  const [notifications, setNotifications] = useState(null)

  useEffect(() => {
    setNotifications(preferences?.notifications ?? {})
  }, [preferences])

  const toggle = async (id, checked) => {
    const next = { ...notifications, [id]: checked }
    setNotifications(next)
    try {
      await savePreferences({ notifications: next })
      notify(`${NOTIFICATION_PREFERENCE_DEFINITIONS.find((d) => d.id === id)?.label} ${checked ? 'enabled' : 'disabled'}.`)
    } catch (error) {
      notify(`Could not save notification preference: ${error.message}`, 'error')
    }
  }

  if (!notifications) return <SectionLoading />

  return (
    <GlowSection title="Notifications">
      <div className="divide-y divide-glow-border">
        {NOTIFICATION_PREFERENCE_DEFINITIONS.map((item) => (
          <Switch
            key={item.id}
            checked={Boolean(notifications[item.id])}
            onChange={(checked) => toggle(item.id, checked)}
            label={item.label}
            description={item.description}
          />
        ))}
      </div>
    </GlowSection>
  )
}

function LanguageThemeSection() {
  const { isDark, toggleTheme } = useTheme()
  const { notify } = useNotifications()
  const { data: preferences } = useAsyncData(getPreferences, [])
  const [language, setLanguage] = useState(null)

  useEffect(() => {
    setLanguage(preferences?.language ?? 'en')
  }, [preferences])

  const handleLanguageChange = async (event) => {
    const value = event.target.value
    setLanguage(value)
    try {
      await savePreferences({ language: value })
      notify('Language preference saved.')
    } catch (error) {
      notify(`Could not save language preference: ${error.message}`, 'error')
    }
  }

  return (
    <GlowSection title="Language & Theme">
      {language === null ? (
        <SectionLoading />
      ) : (
        <Select label="Dashboard Language" value={language} onChange={handleLanguageChange}>
          <option value="en">English</option>
          <option value="ms">Bahasa Melayu</option>
          <option value="zh">中文 (Mandarin)</option>
        </Select>
      )}

      <p className="mb-1.5 mt-5 text-xs font-medium text-glow-text/50">Theme</p>
      <div className="flex gap-2">
        <Button variant={!isDark ? 'glowBrand' : 'glowSecondary'} size="sm" onClick={() => isDark && toggleTheme()}>
          Light
        </Button>
        <Button variant={isDark ? 'glowBrand' : 'glowSecondary'} size="sm" icon={Moon} onClick={() => !isDark && toggleTheme()}>
          Dark
        </Button>
      </div>

      <p className="mb-1.5 mt-5 text-xs font-medium text-glow-text/50">
        Accessibility Mode (FYP II Phase 7)
      </p>
      <UIModeSwitcher />
      <p className="mt-2 text-xs italic text-glow-text/40">
        Low-Sensory: no motion, muted colours, plain language. Senior / Warga Emas: larger text, higher contrast,
        Bahasa Melayu by default, optional text-to-speech.
      </p>
    </GlowSection>
  )
}

function ApiKeysSection() {
  const { data: apiKeys } = useAsyncData(getApiKeys, [])

  return (
    <GlowSection title="API Keys">
      <p className="text-sm italic text-glow-text/50">
        Unavailable — external integration credentials (TikTok, X, Threads, and the AI provider configured for
        recommendations/reports) are stored as Supabase Edge
        Function secrets, never exposed to the frontend (same pattern as every Edge Function in this project). There
        is no safe way to display or regenerate them from this page.
      </p>
      {apiKeys && apiKeys.length > 0 && (
        <ul className="mt-4 space-y-2">
          {apiKeys.map((key) => (
            <li key={key.id} className="text-xs text-glow-text/50">
              {key.name}: {key.masked_value}
            </li>
          ))}
        </ul>
      )}
    </GlowSection>
  )
}

function SecuritySection() {
  const { notify } = useNotifications()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      notify('New password and confirmation must match.', 'error')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      notify('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      notify(`Could not update password: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlowSection title="Security">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
      </div>
      <Button variant="glowBrand" className="mt-4" loading={saving} onClick={handleUpdatePassword}>
        Update Password
      </Button>
      <div className="mt-6 border-t border-glow-border pt-4">
        <p className="text-sm font-medium text-glow-text">Two-Factor Authentication</p>
        <p className="mt-1 text-sm italic text-glow-text/50">
          Unavailable — MFA enrollment is not implemented yet.
        </p>
      </div>
    </GlowSection>
  )
}

function ModelConfigSection() {
  const { notify } = useNotifications()
  const { data: preferences } = useAsyncData(getPreferences, [])
  const [modelConfig, setModelConfig] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setModelConfig({ crisisSensitivity: 'medium', confidenceThreshold: 75, ...(preferences?.model_config ?? {}) })
  }, [preferences])

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePreferences({ model_config: modelConfig })
      notify('Preference saved.')
    } catch (error) {
      notify(`Could not save preference: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <GlowSection title="Model & Detection">
      <p className="text-sm text-glow-text/70">
        No trained sentiment model is deployed yet — sentiment for reviews with a star rating comes from a
        documented heuristic (<code>rating_heuristic_v1</code>), never a real model claim. See{' '}
        <code>docs/SENTIMENT_MODEL.md</code> for current status.
      </p>

      {modelConfig === null ? (
        <SectionLoading />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Crisis Sensitivity (saved preference)"
              value={modelConfig.crisisSensitivity}
              onChange={(event) => setModelConfig((current) => ({ ...current, crisisSensitivity: event.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-glow-text/50">
              <span>Confidence Threshold (saved preference)</span>
              <span>{modelConfig.confidenceThreshold}%</span>
            </span>
            <input
              type="range"
              min={50}
              max={99}
              value={modelConfig.confidenceThreshold}
              onChange={(event) => setModelConfig((current) => ({ ...current, confidenceThreshold: Number(event.target.value) }))}
              className="w-full accent-glow-brand"
            />
          </label>
          <p className="mt-2 text-xs italic text-glow-text/40">
            Saved for your account, but not yet applied to live crisis-detection thresholds (see{' '}
            <code>src/config/crisisThresholds.js</code>, currently fixed for every user).
          </p>
          <Button variant="glowBrand" className="mt-6" loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </>
      )}
    </GlowSection>
  )
}

function DatabaseSection() {
  const { notify } = useNotifications()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { data: preferences } = useAsyncData(getPreferences, [])
  const [backupFrequency, setBackupFrequency] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    setBackupFrequency(preferences?.backup_frequency ?? 'daily')
  }, [preferences])

  const handleChange = async (event) => {
    const value = event.target.value
    setBackupFrequency(value)
    try {
      await savePreferences({ backup_frequency: value })
      notify('Backup frequency preference saved.')
    } catch (error) {
      notify(`Could not save preference: ${error.message}`, 'error')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleResetSession = async () => {
    setResetting(true)
    try {
      await resetUploadedDatasets()
      await signOut()
      navigate(PATHS.login)
    } catch (error) {
      notify(`Could not reset session: ${error.message}`, 'error')
      setResetting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <GlowSection title="Database">
        <p className="text-sm italic text-glow-text/50">
          This app uses one shared Supabase project with row-level security — there is no per-user connection string
          to show.
        </p>
        {backupFrequency !== null && (
          <Select label="Backup Frequency (saved preference)" className="mt-4" value={backupFrequency} onChange={handleChange}>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </Select>
        )}
        <p className="mt-4 text-sm italic text-glow-text/50">
          Unavailable — on-demand backups are a Supabase project-admin operation, not something this app's
          client-side credentials can trigger.
        </p>
        <Button className="mt-6" variant="glowSecondary" icon={RefreshCw} onClick={handleRefresh}>
          Refresh
        </Button>
      </GlowSection>

      <GlowSection title="Danger Zone" className="mt-6">
        <p className="text-sm font-medium text-glow-text">Reset Session</p>
        <p className="mt-1 text-sm text-glow-text/60">
          Full fresh start: permanently deletes every dataset you've uploaded (sales, reviews, social), everything
          visually derived from it (forecast results, Crisis Detection's logged history, saved AI Recommendations),
          and your Business Profile — then signs you out. The next sign-in starts from the onboarding "Do you have
          data?" question again, exactly like a brand-new account.
        </p>
        <Button className="mt-4" variant="danger" onClick={() => setConfirmOpen(true)}>
          Reset Session
        </Button>
      </GlowSection>

      <Dialog
        open={confirmOpen}
        onClose={() => (resetting ? null : setConfirmOpen(false))}
        title="Reset session?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button variant="danger" loading={resetting} onClick={handleResetSession}>
              Yes, delete my datasets and sign out
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This cannot be undone. All uploaded sales, reviews, and social data for this account will be permanently
          deleted, and you'll be signed out immediately.
        </p>
      </Dialog>
    </>
  )
}

function AboutSection() {
  return (
    <GlowSection title="About InsightAid AI">
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-glow-text/50">Version</dt>
          <dd className="font-medium text-glow-text">{ABOUT_INFO.version}</dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-glow-border pt-3">
          <dt className="text-glow-text/50">Full Title</dt>
          <dd className="font-medium text-glow-text">{ABOUT_INFO.fullTitle}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-glow-border pt-3">
          <dt className="text-glow-text/50">Student</dt>
          <dd className="font-medium text-glow-text">{ABOUT_INFO.student}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-glow-border pt-3">
          <dt className="text-glow-text/50">Supervisor</dt>
          <dd className="font-medium text-glow-text">{ABOUT_INFO.supervisor}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-glow-border pt-3">
          <dt className="text-glow-text/50">Institution</dt>
          <dd className="text-right font-medium text-glow-text">{ABOUT_INFO.institution}</dd>
        </div>
      </dl>
    </GlowSection>
  )
}

const SECTION_CONTENT = {
  profile: ProfileSection,
  company: CompanySection,
  notifications: NotificationsSection,
  'language-theme': LanguageThemeSection,
  'api-keys': ApiKeysSection,
  security: SecuritySection,
  'model-config': ModelConfigSection,
  database: DatabaseSection,
  about: AboutSection,
}

export default function SettingsPage() {
  const [active, setActive] = useState('profile')
  const ActiveSection = SECTION_CONTENT[active]

  return (
    <div className="space-y-6">
      <PageHero eyebrow="Account" title="Settings" highlight="Settings" description="Profile, company, notifications, accessibility, and account-level controls." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1" aria-label="Settings sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-sm font-medium transition-colors ${
                active === id
                  ? 'bg-glow-brand text-glow-bg'
                  : 'text-glow-text/70 hover:bg-white/5'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div>
          <ActiveSection />
        </div>
      </div>
    </div>
  )
}
