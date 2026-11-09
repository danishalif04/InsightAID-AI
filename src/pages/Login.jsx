import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Sparkles } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'
import { getProfile } from '@/services/businessProfileService'

// Demo-only credentials for a presentation/supervisor walkthrough. Set to
// [] to hide this panel entirely, e.g. before deploying anywhere actually
// public. "Main (demo identity)" is the developer's own account, deliberately
// renamed to a throwaway demo email/password (never the real one) specifically
// so it could be shown here safely.
const DEMO_ACCOUNTS = [
  { label: 'Business Startup demo (Embun Botanica, synthetic data)', email: 'usertest1@insightai.com', password: 'usertest1' },
  { label: 'Malaysian Local Shop demo (no-data/planning path)', email: 'usertest2@insightai.com', password: 'usertest2' },
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
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <Card className="w-full max-w-sm" bodyClassName="p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-950">
            <Activity className="size-5 text-accent-400" aria-hidden="true" />
          </span>
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Sign in to InsightAid
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">AI Intelligence for your business</p>
        </div>

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
          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link to={PATHS.signup} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            Sign up
          </Link>
        </p>

        {DEMO_ACCOUNTS.length > 0 && (
          <div className="mt-6 space-y-2 rounded-lg border border-dashed border-line bg-canvas p-3 dark:border-line-dark dark:bg-canvas-dark">
            <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">Demo accounts</p>
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.email} className="flex items-center justify-between gap-2 rounded-md bg-surface px-2.5 py-1.5 text-left dark:bg-surface-dark">
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.label}</p>
                  <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-200">
                    {account.email} / {account.password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
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
      </Card>
    </div>
  )
}
