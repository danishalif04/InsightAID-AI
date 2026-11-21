import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'
import { glowBackground } from '@/config/designTokens'

export default function Signup() {
  const { signUp, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [resendState, setResendState] = useState('idle') // idle | sending | sent | error
  const [resendError, setResendError] = useState(null)

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

    // With email confirmation enabled, Supabase deliberately returns a
    // success-shaped response for an email that is ALREADY registered, with
    // an empty `identities` array — no new account, no email sent. Without
    // this check the page tells the user to go check an inbox that will
    // never receive anything.
    if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
      setError('An account with this email already exists. Try signing in instead.')
      return
    }

    // `data` can be null on some failure shapes — reading data.session
    // directly would throw and blank the page out.
    if (data?.session) {
      navigate(PATHS.dashboard, { replace: true })
      return
    }

    setConfirmationSent(true)
  }

  const handleResend = async () => {
    setResendState('sending')
    setResendError(null)
    const { error: resendErr } = await resendConfirmation(email)
    if (resendErr) {
      setResendState('error')
      setResendError(resendErr.message)
      return
    }
    setResendState('sent')
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
              Bring your sales and customer feedback, or none at all, and get recommendations you can
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
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-glow-text/60">
                  Your account was created. Before you can sign in, confirm it using the link sent to{' '}
                  <span className="font-medium text-glow-text">{email}</span>.
                </p>
                <p className="text-xs leading-relaxed text-glow-text/40">
                  It can take a few minutes. Check your spam folder too. If nothing arrives, send it again below.
                </p>

                {resendState === 'sent' ? (
                  <p className="text-sm text-glow-brand">Confirmation email sent again.</p>
                ) : (
                  <Button
                    type="button"
                    variant="glowSecondary"
                    className="w-full"
                    loading={resendState === 'sending'}
                    onClick={handleResend}
                  >
                    Resend confirmation email
                  </Button>
                )}
                {resendError && <p className="text-sm text-danger">{resendError}</p>}

                <p className="text-sm text-glow-text/50">
                  Already confirmed?{' '}
                  <Link to={PATHS.login} className="font-medium text-glow-brand hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
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
