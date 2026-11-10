import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Cloud,
  Lightbulb,
  LineChart,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import AccordionRow from '@/components/ui/AccordionRow'
import { PATHS } from '@/routes/paths'
import { glowBackground } from '@/config/designTokens'

const REPO_URL = 'https://github.com/danishalif04/InsightAID-AI'
const CLOUDFLARE_DEPLOY_URL = `https://deploy.workers.cloudflare.com/?url=${REPO_URL}`

const FEATURES = [
  {
    icon: MessageSquareText,
    title: 'Multilingual Sentiment',
    description:
      'Reads customer opinion in English, Bahasa Melayu, and Mandarin — including code-mixed text — via a fine-tuned XLM-RoBERTa model (84.1% real, measured accuracy).',
  },
  {
    icon: LineChart,
    title: 'Sales Forecasting',
    description:
      'Prophet-based forecasting over your real sales history, with rolling-origin evaluation reported honestly — including when it does not beat a simpler baseline.',
  },
  {
    icon: AlertTriangle,
    title: 'Crisis Detection',
    description:
      'Rule-based signals compared against your own business’s recent baseline, not a generic threshold — flags a real, explainable risk level, not a black box.',
  },
  {
    icon: Lightbulb,
    title: 'AI Recommendations',
    description:
      'A rule engine decides every recommendation from real evidence; an LLM only rewords it into plain language and can never invent a number or a new suggestion.',
  },
]

const FAQS = [
  {
    question: 'What data sources does this support?',
    answer:
      'Sales records, customer reviews, and social posts (TikTok, X, Shopee, Google) — uploaded as CSV/Excel via Dataset Management, or a documented synthetic dataset for demo purposes. Every template and column mapping is documented in-app.',
  },
  {
    question: 'Is this using a real trained AI model, or just rules?',
    answer:
      'Both, and the split is intentional. Sentiment classification is a real, trained XLM-RoBERTa model (84.1% overall accuracy on a held-out test set, meeting this project’s own pre-registered target). Crisis detection and recommendations are rule-based and fully explainable — every recommendation shows the exact evidence that triggered it. An optional LLM layer (Grok) only rewords an already-decided recommendation into plain language; it never decides what to recommend or supplies a number.',
  },
  {
    question: 'Can I try it with demo data?',
    answer:
      'Yes — the Login page lists demo accounts you can sign in with directly, each backed by either real uploaded sales/review data or a documented synthetic dataset, so you can explore every feature without uploading anything yourself.',
  },
  {
    question: 'What languages does it support?',
    answer:
      'Sentiment analysis covers English, Bahasa Melayu, and Mandarin (including code-mixed text). The rest of the interface is currently English-only — full multilingual UI translation is a known, disclosed gap, not something this project claims to have finished.',
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. Each account’s data is isolated via Supabase Row Level Security — no user can read another user’s rows, including the demo accounts. Scraped social data never stores personal identifiers (usernames are hashed or dropped at ingestion).',
  },
  {
    question: 'Is this a finished commercial product?',
    answer:
      'No — this is a Final Year Project research artefact (a Design Science Research build-and-evaluate project), not a live, billed product. The Pricing section below describes a proposed future model only; there is no payment integration anywhere in this system.',
  },
]

const PRICING_TIERS = [
  {
    name: 'Free',
    price: 'RM 0',
    period: '',
    description: 'Explore the dashboard with demo or your own small dataset.',
    features: ['1 business profile', 'Core dashboard & sentiment view', 'Demo datasets included', 'Community support'],
  },
  {
    name: 'Pro',
    price: 'RM 49',
    period: '/month',
    description: 'For a single business ready to act on its own real data.',
    features: [
      'Everything in Free',
      'Unlimited real dataset uploads',
      'Full recommendation engine',
      'Sales forecasting & crisis detection',
      'Email support',
    ],
    highlighted: true,
  },
  {
    name: 'Business',
    price: 'Contact us',
    period: '',
    description: 'For agencies or multi-brand operators.',
    features: [
      'Everything in Pro',
      'Multiple business profiles',
      'Priority support',
      'Custom data integrations',
    ],
  },
]

function GlowSection({ title, description, children, className = '' }) {
  return (
    <div className={`rounded-3xl border border-glow-border bg-glow-surface-elevated p-5 sm:p-8 ${className}`}>
      {title && <h2 className="text-xl font-semibold text-glow-text">{title}</h2>}
      {description && <p className="mt-1.5 max-w-2xl text-sm text-glow-text/60">{description}</p>}
      <div className={title || description ? 'mt-6' : ''}>{children}</div>
    </div>
  )
}

export default function Welcome() {
  return (
    <div className="relative min-h-screen bg-glow-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[640px]"
        style={{ background: glowBackground({ isDark: true }) }}
        aria-hidden="true"
      />

      {/* Minimal top bar — this page renders outside AppShell (pre-login), no TopNav/sidebar */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-glow-brand/15">
            <Sparkles className="size-4 text-glow-brand" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wide text-glow-text/70">InsightAid AI</span>
        </div>
        <Link to={PATHS.login}>
          <Button variant="glowSecondary" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-8 text-center sm:p-14">
          <h1
            className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-glow-text sm:text-5xl"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Decisions, backed by{' '}
            <em
              className="not-italic text-glow-brand"
              style={{ fontFamily: 'var(--font-serif-accent)', fontStyle: 'italic' }}
            >
              evidence
            </em>
            .
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-glow-text/60 sm:text-base">
            An intelligent decision support system for data-driven business analytics in early-stage
            startups — multilingual sentiment, sales forecasting, crisis detection, and explainable
            recommendations, built around Malaysian SMEs and every number traceable back to real data.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={PATHS.login}>
              <Button variant="glowBrand" size="md">
                Try the demo
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="glowSecondary" size="md">
                See pricing
              </Button>
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-5">
              <span className="flex size-9 items-center justify-center rounded-full bg-glow-brand/15">
                <feature.icon className="size-4 text-glow-brand" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-semibold text-glow-text">{feature.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-glow-text/60">{feature.description}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <GlowSection title="Frequently Asked Questions" description="Straight answers about what this system actually does.">
          <div>
            {FAQS.map((faq, index) => (
              <AccordionRow key={faq.question} index={index} title={faq.question}>
                {faq.answer}
              </AccordionRow>
            ))}
          </div>
        </GlowSection>

        {/* Pricing */}
        <section id="pricing">
          <GlowSection>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-glow-text">Pricing</h2>
                <p className="mt-1.5 max-w-2xl text-sm text-glow-text/60">A proposed future pricing model.</p>
              </div>
              <Badge tone="warning">Proposed pricing — no billing integration exists yet</Badge>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-6 ${
                    tier.highlighted
                      ? 'border-glow-brand bg-glow-brand/5 shadow-[0_0_0_1px_rgba(34,197,94,0.15),0_16px_48px_-20px_rgba(34,197,94,0.4)]'
                      : 'border-glow-border bg-white/[0.02]'
                  }`}
                >
                  {tier.highlighted && (
                    <span className="mb-3 inline-flex rounded-full bg-glow-brand/15 px-2.5 py-1 text-xs font-medium text-glow-brand">
                      Most popular
                    </span>
                  )}
                  <p className="text-sm font-semibold text-glow-text">{tier.name}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-glow-text">
                    {tier.price}
                    <span className="text-sm font-medium text-glow-text/50">{tier.period}</span>
                  </p>
                  <p className="mt-2 text-xs text-glow-text/60">{tier.description}</p>
                  <ul className="mt-5 space-y-2.5">
                    {tier.features.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-glow-text/70">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-glow-brand" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </GlowSection>
        </section>

        {/* Deploy to Cloudflare */}
        <GlowSection
          title="Deploy your own copy"
          description="This project is open source. Deploy your own instance to Cloudflare Workers in a few clicks — you'll need your own Supabase project's URL and anon key (see .env.example in the repo)."
        >
          <a href={CLOUDFLARE_DEPLOY_URL} target="_blank" rel="noreferrer">
            <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" className="h-auto" />
          </a>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-glow-text/40">
            <Cloud className="size-3.5 shrink-0" aria-hidden="true" />
            Deploys your own fork — never touches this project's data or credentials.
          </p>
        </GlowSection>

        {/* Final CTA */}
        <section className="rounded-3xl border border-glow-border bg-glow-surface-elevated p-8 text-center sm:p-10">
          <p className="text-lg font-semibold text-glow-text">Ready to see it with your own data?</p>
          <div className="mt-5">
            <Link to={PATHS.login}>
              <Button variant="glowBrand" size="md">
                Try the demo
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
