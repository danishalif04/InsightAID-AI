import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActionsContext } from './actions-context'

const STORAGE_KEY = 'insightaid.localshop.actions'

/** Seeded so the Action Centre is demonstrable before any investigation has run. */
const SEED = [
  {
    id: 'seed-pricing',
    title: 'Review product pricing',
    body: 'Your recorded unit cost has increased. Review the current selling price before the next purchase.',
    source: "User's updated product cost · Pricing calculation",
    status: 'pending',
    createdAt: new Date().toISOString(),
    dueAt: null,
  },
  {
    id: 'seed-sales',
    title: 'Record daily sales',
    body: 'Start recording sales to enable historical sales analysis and future forecasting.',
    source: 'Data readiness engine',
    status: 'recommended',
    createdAt: new Date().toISOString(),
    dueAt: null,
  },
]

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : SEED
  } catch {
    return SEED
  }
}

const REVIEW_DAYS = 14

/**
 * Action lifecycle: DETECT -> INVESTIGATE -> RECOMMEND -> OWNER APPROVES
 * -> MONITOR -> EVALUATE.
 *
 * Accepting schedules a review date and nothing else. The app never
 * changes a price or contacts a supplier on the owner's behalf — the
 * decision is recorded, the action is not performed.
 */
export default function ActionsProvider({ children }) {
  const [actions, setActions] = useState(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
    } catch {
      // Storage unavailable must not break the session.
    }
  }, [actions])

  const addAction = useCallback((action) => {
    setActions((current) => [
      {
        id: `act-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        dueAt: null,
        ...action,
      },
      ...current,
    ])
  }, [])

  const setStatus = useCallback((id, status) => {
    setActions((current) =>
      current.map((action) => {
        if (action.id !== id) return action
        const dueAt =
          status === 'accepted'
            ? new Date(Date.now() + REVIEW_DAYS * 24 * 60 * 60 * 1000).toISOString()
            : action.dueAt
        return { ...action, status, dueAt }
      })
    )
  }, [])

  const value = useMemo(
    () => ({ actions, addAction, setStatus, pendingCount: actions.filter((a) => a.status === 'pending').length }),
    [actions, addAction, setStatus]
  )

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>
}
