import { Volume2, VolumeX } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'
import { summarizeScoreBM } from '@/utils/seniorModeSummaries'

/**
 * FYP II Phase 7, Senior/Mod Warga Emas mode — "Apa yang perlu saya buat?"
 * panel: the real top-3 recommendations the rule engine already produced
 * (same data every other page shows, not a separate computation), in a
 * larger, BM-first presentation, plus a real spoken summary of the
 * account's current sentiment score via the browser's own Web Speech API.
 *
 * Honest limitation, stated here rather than hidden: no i18n
 * infrastructure exists in this app (confirmed — no react-i18next, no
 * translation files), so each recommendation's own title/evidence text
 * stays in whatever language the rule engine produced it in (English).
 * Only this panel's own framing text, and the spoken summary sentence
 * (built fresh from real numbers, not translated from English), are BM.
 */
export default function SeniorModePanel({ recommendations = [], sentimentScore = null }) {
  const tts = useTextToSpeech('ms-MY')
  const summary = sentimentScore ? summarizeScoreBM(sentimentScore) : null

  return (
    <Card title="Apa yang perlu saya buat?" className="border-2 border-accent-500">
      {summary && (
        <div className="mb-4 flex items-start gap-3 rounded-lg bg-canvas p-3 dark:bg-canvas-dark">
          <p className="flex-1 text-base leading-relaxed text-slate-800 dark:text-slate-100">{summary}</p>
          {tts.supported && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={tts.speaking ? VolumeX : Volume2}
              onClick={() => (tts.speaking ? tts.stop() : tts.speak(summary))}
              aria-label={tts.speaking ? 'Hentikan bacaan' : 'Baca dengan kuat'}
            >
              {tts.speaking ? 'Henti' : 'Dengar'}
            </Button>
          )}
        </div>
      )}

      {recommendations.length === 0 ? (
        <p className="text-base text-slate-600 dark:text-slate-300">
          Tiada cadangan buat masa ini, semuanya nampak baik.
        </p>
      ) : (
        <ol className="space-y-3">
          {recommendations.slice(0, 3).map((rec, index) => (
            <li
              key={rec.id}
              className="flex items-start gap-3 rounded-lg border border-line p-3 dark:border-line-dark"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-base font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'neutral'}>
                    {rec.priority}
                  </Badge>
                  <Badge tone="neutral">{rec.category}</Badge>
                </div>
                <p className="mt-1.5 text-base font-medium text-slate-900 dark:text-slate-100">{rec.title}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
