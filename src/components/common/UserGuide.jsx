import { useState } from 'react'
import { BookOpen, Lightbulb, Rocket, Store } from 'lucide-react'
import { USER_GUIDE } from '@/constants/userGuide'

const ICONS = { 'local-shop': Store, 'business-startup': Rocket }

/** Tabbed, step-by-step guide for both pathways with real screenshots. */
export default function UserGuide() {
  const [active, setActive] = useState(USER_GUIDE[0].id)
  const guide = USER_GUIDE.find((g) => g.id === active) ?? USER_GUIDE[0]

  return (
    <section id="guide" className="scroll-mt-6 rounded-3xl border border-glow-border bg-glow-surface-elevated p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-glow-brand/15">
          <BookOpen className="size-4 text-glow-brand" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-glow-text">How to use InsightAid AI</h2>
          <p className="mt-0.5 text-sm text-glow-text/60">Step-by-step guides for both pathways, with real screens from the app.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Choose a pathway" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {USER_GUIDE.map((g) => {
          const Icon = ICONS[g.id] ?? Store
          const selected = g.id === active
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`guide-panel-${g.id}`}
              id={`guide-tab-${g.id}`}
              onClick={() => setActive(g.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                selected ? 'border-glow-brand/60 bg-glow-brand/10' : 'border-glow-border bg-white/[0.02] hover:border-glow-brand/30'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-glow-text">
                <Icon className="size-4 text-glow-brand" aria-hidden="true" />
                {g.label}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-glow-text/60">{g.tagline}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`guide-panel-${guide.id}`} aria-labelledby={`guide-tab-${guide.id}`} className="mt-6">
        <p className="text-sm text-glow-text/70">{guide.who}</p>

        <ol className="mt-5 space-y-5">
          {guide.steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-1 gap-4 rounded-2xl border border-glow-border bg-white/[0.02] p-4 lg:grid-cols-[1fr_1.15fr] lg:gap-6 lg:p-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-glow-brand text-sm font-bold text-glow-bg">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-glow-text">{step.title}</h3>
                </div>
                <p className="mt-3 inline-block rounded-full border border-glow-brand/40 px-3 py-1 text-xs font-medium text-glow-brand">
                  {step.where}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-glow-text/75">{step.body}</p>
              </div>
              <a href={step.image} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-glow-border" title="Open full size">
                <img src={step.image} alt={`${guide.label}, step ${index + 1}: ${step.title}`} loading="lazy" className="block h-auto w-full" />
              </a>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-2xl border border-glow-border bg-white/[0.02] p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-glow-text">
            <Lightbulb className="size-4 text-glow-brand" aria-hidden="true" />
            Tips
          </p>
          <ul className="mt-2 space-y-1.5">
            {guide.tips.map((tip) => (
              <li key={tip} className="text-sm leading-relaxed text-glow-text/70">
                • {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
