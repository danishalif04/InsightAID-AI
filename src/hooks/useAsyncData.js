import { useCallback, useEffect, useState } from 'react'

/**
 * Thrown by a loader to distinguish "this capability isn't implemented /
 * isn't configured" from a normal fetch failure (FYP2.md §65's 'Unavailable'
 * state, e.g. "TikTok data is currently unavailable"). Caught by
 * useAsyncData and surfaced as status 'unavailable' instead of 'error'.
 */
export class DataUnavailableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DataUnavailableError'
  }
}

/**
 * Wraps an async loader into the FYP2.md §65 state machine:
 * 'loading' -> 'success' | 'error' | 'unavailable'.
 * 'empty' is a presentational refinement of 'success' with no data — see
 * AsyncSection's `emptyWhen` prop, not a distinct hook state, since only the
 * caller knows what "empty" means for its particular data shape.
 */
export function useAsyncData(loader, deps = []) {
  const [status, setStatus] = useState('loading')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)

    loader()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setStatus('success')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setStatus(err instanceof DataUnavailableError ? 'unavailable' : 'error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  return { status, data, error, reload }
}
