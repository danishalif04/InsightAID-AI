import { MODES } from '@/constants/modes'

/**
 * A read-only badge showing THIS account's one business pathway — not a
 * switcher. The pathway (`user_preferences.workspace_mode`) is decided
 * once, at onboarding (Onboarding.jsx's handleChooseWorkspaceMode), and
 * is meant to stay fixed for that account from then on: a demo account
 * set up as "Malaysian Local Shop" should never be flippable into
 * "Business Startup" mid-session just by clicking a tab — that changes
 * which data/rules/content the whole app shows. Previously rendered
 * BOTH options as a clickable segmented control; `onChange` is accepted
 * for backward API compatibility with TopNav/MobileNavSheet but is no
 * longer wired to anything interactive here.
 */
export default function ModeSwitcher({ mode }) {
  const option = MODES[mode] ?? Object.values(MODES)[0]
  const Icon = option.icon

  return (
    <div
      role="status"
      aria-label="Business mode (fixed for this account)"
      title={option.description}
      className="flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2.5 py-1.5 text-xs font-medium text-accent-700 dark:border-line-dark dark:bg-canvas-dark dark:text-accent-400"
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{option.shortLabel}</span>
    </div>
  )
}
