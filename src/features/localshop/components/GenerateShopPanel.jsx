import { useState } from 'react'
import { Loader2, Wand2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { generateShopScenario } from '@/services/shopScenarioService'
import { useLang } from '../i18n/useLang'
import { useShop } from '../store/useShop'

/**
 * Builds a starting scenario from the owner's own three answers — sector,
 * monthly revenue target, free-text description — and puts it into
 * ShopProvider, which is the same slot `loadDemo()` fills. Every Local Shop
 * page then renders it with no change of its own.
 *
 * The division of labour is stated on screen, not just in code: the model
 * supplies products, prices and costs; the engine computes break-even,
 * margins and everything else. The generated shop carries
 * `provenance: 'ai-generated'` AND `illustrative: true`, so existing
 * ribbons keep working and it can never render as the owner's own records.
 */
export default function GenerateShopPanel({ onGenerated }) {
  const { t } = useLang()
  const { setShop, loadDemo } = useShop()

  const [sector, setSector] = useState('')
  const [revenueTarget, setRevenueTarget] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const canSubmit = description.trim().length > 0 && !busy

  async function handleGenerate(event) {
    event.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)

    const result = await generateShopScenario({ sector, revenueTarget, description })

    if (!result.ok) {
      // Shown verbatim rather than replaced with a generic message: an owner
      // who can see WHY it failed can fix their description. A silent retry
      // or a canned fallback would hide a real failure.
      setError(result.message)
      setBusy(false)
      return
    }

    setShop(result.shop)
    setBusy(false)
    onGenerated?.(result)
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-glow-text">{t('generate.title')}</h2>
        <p className="mt-1 text-xs text-glow-text/60">{t('generate.subtitle')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t('generate.sector')}
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          placeholder="Retail / E-commerce"
          disabled={busy}
        />
        <Input
          label={t('generate.target')}
          type="number"
          min="1"
          step="100"
          value={revenueTarget}
          onChange={(e) => setRevenueTarget(e.target.value)}
          placeholder="9000"
          disabled={busy}
        />
      </div>

      <div>
        <Textarea
          label={t('generate.description')}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('generate.descriptionHint')}
          disabled={busy}
          required
        />
        <p className="mt-1 text-[11px] text-glow-text/50">{t('generate.descriptionHint')}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
          <p className="text-xs font-semibold text-rose-300">{t('generate.failed')}</p>
          <p className="mt-0.5 text-xs text-rose-200/80">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={!canSubmit}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('generate.loading')}
            </>
          ) : (
            <>
              <Wand2 className="size-4" aria-hidden="true" />
              {error ? t('generate.retry') : t('generate.action')}
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={loadDemo}
          disabled={busy}
          className="text-xs text-glow-text/60 underline underline-offset-2 hover:text-glow-text disabled:opacity-50"
        >
          {t('generate.orDemo')}
        </button>
      </div>

      {/* Stated on screen, every time. The owner should never have to infer
          which numbers came from a language model and which were computed. */}
      <p className="text-[11px] leading-relaxed text-glow-text/45">{t('generate.disclosure')}</p>
    </form>
  )
}
