import { useState } from 'react'
import {
  Bell,
  Building2,
  Camera,
  Copy,
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
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import Switch from '@/components/ui/Switch'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme } from '@/hooks/useTheme'
import {
  aboutInfo,
  apiKeys as initialApiKeys,
  companyDefaults,
  databaseDefaults,
  modelConfigDefaults,
  notificationDefaults,
  profileDefaults,
} from '@/data/settingsData'

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'language-theme', label: 'Language & Theme', icon: Globe },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'model-config', label: 'Model Config', icon: SlidersHorizontal },
  { id: 'database', label: 'Database', icon: DatabaseIcon },
  { id: 'about', label: 'About', icon: Info },
]

function ProfileSection() {
  const { notify } = useNotifications()
  const [form, setForm] = useState(profileDefaults)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  return (
    <Card title="Profile">
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand-950 text-lg font-semibold text-white">
          AU
        </span>
        <Button variant="secondary" size="sm" icon={Camera} onClick={() => notify('Photo upload is not wired to a backend yet.', 'info')}>
          Change Photo
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Full Name" value={form.fullName} onChange={update('fullName')} />
        <Input label="Email" type="email" value={form.email} onChange={update('email')} />
        <Input label="Role" value={form.role} onChange={update('role')} />
        <Input label="Phone" value={form.phone} onChange={update('phone')} />
      </div>
      <Button className="mt-6" onClick={() => notify('Profile changes saved.')}>
        Save Changes
      </Button>
    </Card>
  )
}

function CompanySection() {
  const { notify } = useNotifications()
  const [form, setForm] = useState(companyDefaults)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  return (
    <Card title="Company">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Company Name" value={form.name} onChange={update('name')} />
        <Input label="Industry" value={form.industry} onChange={update('industry')} />
        <Input label="Company Size" value={form.size} onChange={update('size')} />
        <Input label="Website" value={form.website} onChange={update('website')} />
      </div>
      <Button className="mt-6" onClick={() => notify('Company details saved.')}>
        Save Changes
      </Button>
    </Card>
  )
}

function NotificationsSection() {
  const { notify } = useNotifications()
  const [items, setItems] = useState(notificationDefaults)
  const toggle = (id) => (checked) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, checked } : item)))

  return (
    <Card title="Notifications">
      <div className="divide-y divide-line dark:divide-line-dark">
        {items.map((item) => (
          <Switch
            key={item.id}
            checked={item.checked}
            onChange={(checked) => {
              toggle(item.id)(checked)
              notify(`${item.label} ${checked ? 'enabled' : 'disabled'}.`)
            }}
            label={item.label}
            description={item.description}
          />
        ))}
      </div>
    </Card>
  )
}

function LanguageThemeSection() {
  const { isDark, toggleTheme } = useTheme()
  const [language, setLanguage] = useState('en')
  const { notify } = useNotifications()

  return (
    <Card title="Language & Theme">
      <Select
        label="Dashboard Language"
        value={language}
        onChange={(event) => {
          setLanguage(event.target.value)
          notify('Language preference saved.')
        }}
      >
        <option value="en">English</option>
        <option value="ms">Bahasa Melayu</option>
        <option value="zh">中文 (Mandarin)</option>
      </Select>

      <p className="mb-1.5 mt-5 text-xs font-medium text-slate-500 dark:text-slate-400">Theme</p>
      <div className="flex gap-2">
        <Button variant={!isDark ? 'primary' : 'secondary'} size="sm" onClick={() => isDark && toggleTheme()}>
          Light
        </Button>
        <Button variant={isDark ? 'primary' : 'secondary'} size="sm" icon={Moon} onClick={() => !isDark && toggleTheme()}>
          Dark
        </Button>
      </div>
    </Card>
  )
}

function ApiKeysSection() {
  const { notify } = useNotifications()
  const [keys, setKeys] = useState(initialApiKeys)

  const regenerate = (id) => {
    setKeys((current) =>
      current.map((key) =>
        key.id === id ? { ...key, masked: key.masked.replace(/[0-9a-f]{4}$/i, Math.random().toString(16).slice(2, 6)) } : key
      )
    )
    notify('API key regenerated. Update any connected services.')
  }

  const copy = (masked) => {
    navigator.clipboard?.writeText(masked)
    notify('Copied to clipboard.')
  }

  return (
    <Card title="API Keys">
      <ul className="space-y-3">
        {keys.map((key) => (
          <li
            key={key.id}
            className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between dark:border-line-dark"
          >
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{key.name}</p>
              <p className="font-mono text-xs text-slate-400">{key.masked}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={Copy} onClick={() => copy(key.masked)}>
                Copy
              </Button>
              <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => regenerate(key.id)}>
                Regenerate
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function SecuritySection() {
  const { notify } = useNotifications()
  const [twoFactor, setTwoFactor] = useState(true)

  return (
    <Card title="Security">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Current Password" type="password" />
        <Input label="New Password" type="password" />
        <Input label="Confirm New Password" type="password" />
      </div>
      <Button className="mt-4" onClick={() => notify('Password updated.')}>
        Update Password
      </Button>
      <div className="mt-6 border-t border-line pt-4 dark:border-line-dark">
        <Switch
          checked={twoFactor}
          onChange={(checked) => {
            setTwoFactor(checked)
            notify(`Two-factor authentication ${checked ? 'enabled' : 'disabled'}.`)
          }}
          label="Two-Factor Authentication"
          description="Require a one-time code in addition to your password"
        />
      </div>
    </Card>
  )
}

function ModelConfigSection() {
  const { notify } = useNotifications()
  const [form, setForm] = useState(modelConfigDefaults)

  return (
    <Card title="Model Configuration">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Sentiment Model"
          value={form.sentimentModel}
          onChange={(event) => setForm((current) => ({ ...current, sentimentModel: event.target.value }))}
        >
          <option>XLM-RoBERTa v2.1</option>
          <option>mBERT v1.4</option>
        </Select>
        <Select
          label="Crisis Sensitivity"
          value={form.crisisSensitivity}
          onChange={(event) => setForm((current) => ({ ...current, crisisSensitivity: event.target.value }))}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </div>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Confidence Threshold</span>
          <span>{form.confidenceThreshold}%</span>
        </span>
        <input
          type="range"
          min={50}
          max={99}
          value={form.confidenceThreshold}
          onChange={(event) => setForm((current) => ({ ...current, confidenceThreshold: Number(event.target.value) }))}
          className="w-full accent-accent-500"
        />
      </label>
      <Button className="mt-6" onClick={() => notify('Model configuration saved.')}>
        Save Changes
      </Button>
    </Card>
  )
}

function DatabaseSection() {
  const { notify } = useNotifications()
  const [backupFrequency, setBackupFrequency] = useState(databaseDefaults.backupFrequency)
  const [runningBackup, setRunningBackup] = useState(false)

  return (
    <Card title="Database">
      <Input label="Connection String" value={databaseDefaults.connectionString} readOnly />
      <Select
        label="Backup Frequency"
        className="mt-4"
        value={backupFrequency}
        onChange={(event) => setBackupFrequency(event.target.value)}
      >
        <option value="hourly">Hourly</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </Select>
      <p className="mt-2 text-xs text-slate-400">
        Last backup: {new Date(databaseDefaults.lastBackup).toLocaleString('en-MY')}
      </p>
      <Button
        variant="secondary"
        className="mt-4"
        loading={runningBackup}
        onClick={() => {
          setRunningBackup(true)
          setTimeout(() => {
            setRunningBackup(false)
            notify('Backup completed successfully.')
          }, 900)
        }}
      >
        Run Backup Now
      </Button>
    </Card>
  )
}

function AboutSection() {
  return (
    <Card title="About InsightAid AI">
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500 dark:text-slate-400">Version</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{aboutInfo.version}</dd>
        </div>
        <div className="flex flex-col gap-1 border-t border-line pt-3 dark:border-line-dark">
          <dt className="text-slate-500 dark:text-slate-400">Full Title</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{aboutInfo.fullTitle}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 dark:border-line-dark">
          <dt className="text-slate-500 dark:text-slate-400">Student</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{aboutInfo.student}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 dark:border-line-dark">
          <dt className="text-slate-500 dark:text-slate-400">Supervisor</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{aboutInfo.supervisor}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-3 dark:border-line-dark">
          <dt className="text-slate-500 dark:text-slate-400">Institution</dt>
          <dd className="text-right font-medium text-slate-800 dark:text-slate-100">{aboutInfo.institution}</dd>
        </div>
      </dl>
    </Card>
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="space-y-1" aria-label="Settings sections">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              active === id
                ? 'bg-accent-500 text-white'
                : 'text-slate-600 hover:bg-canvas dark:text-slate-300 dark:hover:bg-canvas-dark'
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
  )
}
