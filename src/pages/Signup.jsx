import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'
import { glowBackground } from '@/config/designTokens'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await signUp(email, password, fullName)
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data.session) {
      navigate(PATHS.dashboard, { replace: true })
    } else {
      setConfirmationSent(true)
    }
  }

  return (
    <div className="relative min-h-screen bg-glow-bg">
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[480px]"
        style={{ background: glowBackground() }}
        aria-hidden="true"
      />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-glow-brand/15">
              <Activity className="size-4 text-glow-brand" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-glow-text/70">InsightAid AI</span>
          </div>
          <div>
            <h1 className="text-[2.75rem] font-semibold leading-[1.05] tracking-tight text-glow-text" style={{ fontFamily: 'var(--font-ui)' }}>
              Start with a{' '}
              <em className="not-italic text-glow-brand" style={{ fontFamily: 'var(--font-serif-accent)', fontStyle: 'italic' }}>
                clear
              </em>{' '}
              picture.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-glow-text/60">
              Bring your sales and customer feedback — or none at all — and get recommendations you can
              trace back to the evidence behind them.
            </p>
          </div>
          <p className="text-xs text-glow-text/30">
            An Intelligent Decision Support System for Data-Driven Business Analytics in Early-Stage Startups
          </p>
        </div>

        <div className="flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm rounded-3xl border border-glow-border bg-glow-surface-elevated p-8">
            <div className="flex flex-col items-center gap-2 text-center lg:hidden">
              <span className="flex size-10 items-center justify-center rounded-full bg-glow-brand/15">
                <Activity className="size-5 text-glow-brand" aria-hidden="true" />
              </span>
            </div>
            <h2 className="text-center text-lg font-semibold text-glow-text lg:text-left">
              Create your InsightAid account
            </h2>

            {confirmationSent ? (
              <p className="mt-6 text-center text-sm leading-relaxed text-glow-text/60 lg:text-left">
                Check <span className="font-medium text-glow-text">{email}</span> for a confirmation link, then{' '}
                <Link to={PATHS.login} className="font-medium text-glow-brand hover:underline">
                  sign in
                </Link>
                .
              </p>
            ) : (
              <>
                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <Input
                    label="Full Name"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                  />
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
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <Button type="submit" variant="glowBrand" loading={loading} className="w-full">
                    Sign Up
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-glow-text/50">
                  Already have an account?{' '}
                  <Link to={PATHS.login} className="font-medium text-glow-brand hover:underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
