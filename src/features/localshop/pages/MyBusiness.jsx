import { Store } from 'lucide-react'
import { Input, Select } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import Section from '../components/Section'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'
import { LANGUAGES } from '../i18n/strings'

const FIELDS = [
  { id: 'name', label: 'Business name' },
  { id: 'category', label: 'Category' },
  { id: 'location', label: 'Location' },
  { id: 'model', label: 'Operating model' },
]

export default function MyBusiness() {
  const { t } = useLang()
  const { shop, setShop, hasShop, loadDemo } = useShop()

  if (!hasShop) {
    return (
      <Section>
        <EmptyState icon={Store} message={t('overview.empty')} actionLabel={t('overview.loadDemo')} onAction={loadDemo} />
      </Section>
    )
  }

  const update = (field, value) => setShop((current) => ({ ...current, [field]: value }))

  return (
    <Section
      title={t('nav.business')}
      description="Your business profile. Everything you type here is your own input and is used as-is by the calculations."
      provenance="Your input"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Input
            key={field.id}
            label={field.label}
            value={shop[field.id] ?? ''}
            onChange={(event) => update(field.id, event.target.value)}
          />
        ))}
        <Select label="Preferred language" value={shop.language ?? 'en'} onChange={(event) => update('language', event.target.value)}>
          {LANGUAGES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Available capital (RM, optional)"
          type="number"
          value={shop.availableCapital ?? ''}
          onChange={(event) => update('availableCapital', event.target.value === '' ? null : Number(event.target.value))}
        />
      </div>
    </Section>
  )
}
