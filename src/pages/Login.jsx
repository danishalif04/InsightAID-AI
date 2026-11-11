import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import brandMark from '@/assets/insightaid-mark.png'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'
import { getProfile } from '@/services/businessProfileService'
import { glowBackground } from '@/config/designTokens'

// Demo-only credentials for a presentation/supervisor walkthrough. Set to
// [] to hide this panel entirely, e.g. before deploying anywhere actually
// public. "Main (demo identity)" is the developer's own account, deliberately
// renamed to a throwaway demo email/password (never the real one) specifically
// so it could be shown here safely.
const DEMO_ACCOUNTS = [
  { label: 'Business Startup demo (Embun Botanica, real uploaded data)', email: 'usertest1@insightai.com', password: 'usertest1' },
  { label: 'Malaysian Local Shop demo (no-data/planning path)', email: 'usertest2@insightai.com', password: 'usertest2' },
  { label: 'Malaysian Local Shop demo (Kedai Makan Pak Long, synthetic data)', email: 'usertest3@insightai.com', password: 'usertest3' },
  { label: 'Business Startup demo (Kasual Thread Co., synthetic data)', email: 'usertest4@insightai.com', password: 'usertest4' },
  { label: 'Main (demo identity)', email: 'demotest1@gmail.com', password: 'demotest1' },
]

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const fillDemoCredentials = (account) => {
    setEmail(account.email)
    setPassword(account.password)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }

    // No business profile (e.g. after a full "Reset Session") -> treat this
    // sign-in like a brand-new account and show the onboarding choice step
    // again, instead of landing on a dashboard (or wherever RequireAuth
    // happened to bounce them from) with nothing in it. Checked
    // unconditionally — `location.state?.from` is NOT a reliable signal for
    // "this is a normal login": signOut() during Reset Session triggers
    // RequireAuth's own redirect-to-login with a `from` of whatever page
    // the reset was clicked from, which would otherwise wrongly take
    // priority over the onboarding check.
    try {
      const profile = await getProfile()
      if (!profile.exists) {
        setLoading(false)
        navigate(PATHS.onboarding, { replace: true })
        return
      }
    } catch {
      // If this check itself fails, fall through to the normal redirect
      // rather than blocking sign-in over a non-essential check.
    }

    setLoading(false)
    navigate(location.state?.from ?? PATHS.dashboard, { replace: true })
  }

  return (
    <div className="relative min-h-screen bg-glow-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[480px]"
        style={{ background: glowBackground() }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Brand panel — hidden on small screens, the form is what matters there */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-2.5">
            <img
              src={brandMark}
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="size-10 rounded-xl shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_8px_24px_-10px_rgba(34,197,94,0.55)]"
            />
            <span className="text-sm font-semibold uppercase tracking-wide text-glow-text/70">InsightAid AI</span>
          </div>
          <div>
            <img
              src={brandMark}
              alt=""
              aria-hidden="true"
              width={128}
              height={128}
              className="mb-6 size-32 rounded-[1.75rem] shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_24px_64px_-24px_rgba(34,197,94,0.65)]"
            />
            <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-glow-text" style={{ fontFamily: 'var(--font-ui)' }}>
              Decisions, backed by{' '}
              <em className="not-italic text-glow-brand" style={{ fontFamily: 'var(--font-serif-accent)', fontStyle: 'italic' }}>
                evidence
              </em>
              .
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-glow-text/60">
              Multilingual sentiment, sales forecasting, and crisis detection for early-stage businesses —
              every number traceable back to your own data.
            </p>
          </div>
          <p className="text-xs text-glow-text/30">
            An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups
          </p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm rounded-3xl border border-glow-border bg-glow-surface-elevated p-8">
            <div className="mb-4 flex flex-col items-center gap-2 text-center lg:hidden">
              <img
                src={brandMark}
                alt="InsightAid AI"
                width={64}
                height={64}
                className="size-16 rounded-2xl shadow-[0_0_0_1px_rgba(34,197,94,0.25),0_12px_32px_-14px_rgba(34,197,94,0.6)]"
              />
            </div>
            <h2 className="text-center text-lg font-semibold text-glow-text lg:text-left">
              Sign in to InsightAid
            </h2>
            <p className="mt-1 text-center text-sm text-glow-text/50 lg:text-left">AI Intelligence for your business</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" variant="glowBrand" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-glow-text/50">
              Don&apos;t have an account?{' '}
              <Link to={PATHS.signup} className="font-medium text-glow-brand hover:underline">
                Sign up
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-glow-text/40">
              <Link to={PATHS.welcome} className="hover:underline hover:text-glow-text/60">
                Learn more about InsightAid AI
              </Link>
            </p>

            {DEMO_ACCOUNTS.length > 0 && (
              <div className="mt-6 space-y-2 rounded-2xl border border-dashed border-glow-border bg-white/[0.02] p-3">
                <p className="text-center text-xs font-medium text-glow-text/50">Demo accounts</p>
                {DEMO_ACCOUNTS.map((account) => (
                  <div key={account.email} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-2.5 py-1.5 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-glow-text/50">{account.label}</p>
                      <p className="truncate font-mono text-xs text-glow-text/80">
                        {account.email} / {account.password}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="glowSecondary"
                      size="sm"
                      icon={Sparkles}
                      className="shrink-0"
                      onClick={() => fillDemoCredentials(account)}
                    >
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
