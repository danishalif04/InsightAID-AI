/**
 * Wraps an async function so that calls made while an earlier call is
 * still running share that call's promise instead of starting a second
 * request. Nothing is cached: once the promise settles, the next call
 * starts a fresh request, so data can never go stale.
 *
 * Used for reads that several components fire at the same moment on page
 * load (user preferences, the business profile), which previously sent
 * every request twice.
 */
export function shareInFlight(fn) {
  let pending = null
  return function shared(...args) {
    if (pending) return pending
    pending = Promise.resolve()
      .then(() => fn(...args))
      .finally(() => {
        pending = null
      })
    return pending
  }
}
