import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'
import { getProfile } from '@/services/businessProfileService'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

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
      </Card>
    </div>
  )
}
