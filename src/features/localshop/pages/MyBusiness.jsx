import { Store } from 'lucide-react'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { FIELDS_BY_ID } from '@/utils/businessProfileSchema'
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
        {/* Same option list as the onboarding "Business Sector" dropdown
            (businessProfileSchema.js), so a shop entered here and one
            entered there are describable in the same terms. */}
        <Select label="Business sector" value={shop.sector ?? ''} onChange={(event) => update('sector', event.target.value)}>
          <option value="">Not stated</option>
          {FIELDS_BY_ID.industry.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Input
          label="Available capital (RM, optional)"
          type="number"
          value={shop.availableCapital ?? ''}
          onChange={(event) => update('availableCapital', event.target.value === '' ? null : Number(event.target.value))}
        />
        {/* Your own goal, not a forecast — nothing in the engine derives a
            prediction from it, and leaving it blank changes no calculation. */}
        <Input
          label="Revenue target (RM / month, optional)"
          type="number"
          min="0"
          value={shop.revenueTarget ?? ''}
          onChange={(event) => update('revenueTarget', event.target.value === '' ? null : Number(event.target.value))}
        />
      </div>

      <div className="mt-4">
        <Textarea
          label="Business description (optional)"
          rows={5}
          placeholder="In your own words: what you sell, where, to whom, and what you want to find out."
          value={shop.description ?? ''}
          onChange={(event) => update('description', event.target.value)}
        />
      </div>
    </Section>
  )
}
