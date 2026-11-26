import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { PATHS } from '@/routes/paths'
import { startDemo } from '@/services/demoService'

/** One click: anonymous account + the synthetic Koperasi Siswa Maju data, then the Dashboard. */
export default function TryDemoButton({ className = '', variant = 'glowSecondary' }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const handleClick = async () => {
    setBusy(true)
    setError(null)
    try {
      await startDemo()
      navigate(PATHS.dashboard, { replace: true })
    } catch (e) {
      setError(e?.message ?? 'The demo could not start.')
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant={variant} icon={PlayCircle} loading={busy} className="w-full" onClick={handleClick}>
        {busy ? 'Preparing your demo shop' : 'Try the demo, no sign up'}
      </Button>
      <p className="mt-1.5 text-center text-xs text-glow-text/50">
        {error ?? 'Your own private copy of Koperasi Siswa Maju, a fictional cooperative with synthetic data.'}
      </p>
    </div>
  )
}
