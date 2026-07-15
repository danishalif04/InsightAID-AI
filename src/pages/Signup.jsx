import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { PATHS } from '@/routes/paths'

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
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4">
      <Card className="w-full max-w-sm" bodyClassName="p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-950">
            <Activity className="size-5 text-accent-400" aria-hidden="true" />
          </span>
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create your InsightAid account
          </h1>
        </div>

        {confirmationSent ? (
          <p className="mt-6 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Check <span className="font-medium">{email}</span> for a confirmation link, then{' '}
            <Link to={PATHS.login} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
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
              <Button type="submit" loading={loading} className="w-full">
                Sign Up
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to={PATHS.login} className="font-medium text-accent-600 hover:underline dark:text-accent-400">
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
